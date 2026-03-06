// axiom-renderer/src/context.rs
// GPU context initialization for both WASM and native targets

pub struct RenderContext {
    pub device: wgpu::Device,
    pub queue: wgpu::Queue,
    pub surface: Option<wgpu::Surface<'static>>,
    pub surface_config: Option<wgpu::SurfaceConfiguration>,
}

#[cfg(target_arch = "wasm32")]
fn compact_error_message(message: &str) -> String {
    if message.contains("maxInterStageShaderComponents") {
        return "WebGPU fallback is not available in this browser build".to_string();
    }

    message
        .lines()
        .next()
        .unwrap_or(message)
        .replace("..", ".")
        .trim()
        .to_string()
}

impl RenderContext {
    #[cfg(target_arch = "wasm32")]
    pub async fn new_for_canvas(canvas: web_sys::HtmlCanvasElement) -> Result<Self, String> {
        use web_sys::console;

        console::log_1(&"Axiom Renderer: Initializing renderer...".into());

        match Self::try_new_for_canvas(canvas.clone(), wgpu::Backends::GL, "WebGL2").await {
            Ok(context) => Ok(context),
            Err(webgl_error) => {
                let webgl_error = compact_error_message(&webgl_error);
                console::warn_1(
                    &format!("WebGL2 backend unavailable, falling back: {}", webgl_error).into(),
                );

                match Self::try_new_for_canvas(
                    canvas,
                    wgpu::Backends::BROWSER_WEBGPU,
                    "WebGPU",
                )
                .await
                {
                    Ok(context) => Ok(context),
                    Err(webgpu_error) => {
                        let webgpu_error = compact_error_message(&webgpu_error);
                        let message = format!(
                            "Failed to initialize renderer. WebGL2 error: {}. WebGPU error: {}. \
If you're using Brave, open brave://gpu and confirm WebGL/WebGL2 or WebGPU are available, \
leave hardware acceleration enabled, and reduce Shields/fingerprinting protections for this site if graphics APIs are blocked.",
                            webgl_error, webgpu_error
                        );
                        console::error_1(&message.clone().into());
                        Err(message)
                    }
                }
            }
        }
    }

    #[cfg(target_arch = "wasm32")]
    async fn try_new_for_canvas(
        canvas: web_sys::HtmlCanvasElement,
        backends: wgpu::Backends,
        backend_label: &str,
    ) -> Result<Self, String> {
        use web_sys::console;

        console::log_1(&format!("Axiom Renderer: Attempting {} backend...", backend_label).into());

        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends,
            ..Default::default()
        });

        let surface = instance
            .create_surface(wgpu::SurfaceTarget::Canvas(canvas.clone()))
            .map_err(|e| {
                compact_error_message(&format!("Failed to create surface: {:?}", e))
            })?;

        console::log_1(&format!("Surface created successfully ({})", backend_label).into());

        let mut selected_adapter = None;
        for power_preference in [
            wgpu::PowerPreference::HighPerformance,
            wgpu::PowerPreference::LowPower,
            wgpu::PowerPreference::None,
        ] {
            for force_fallback_adapter in [false, true] {
                let adapter = instance
                    .request_adapter(&wgpu::RequestAdapterOptions {
                        power_preference,
                        compatible_surface: Some(&surface),
                        force_fallback_adapter,
                    })
                    .await;

                if let Some(adapter) = adapter {
                    selected_adapter = Some((adapter, power_preference, force_fallback_adapter));
                    break;
                }
            }

            if selected_adapter.is_some() {
                break;
            }
        }

        let (adapter, power_preference, force_fallback_adapter) = selected_adapter.ok_or_else(|| {
            format!(
                "Failed to find a {} adapter. The browser may have graphics acceleration disabled or blocked.",
                backend_label
            )
        })?;

        let adapter_info = adapter.get_info();
        console::log_1(
            &format!(
                "GPU Adapter: {} (backend: {:?}, power: {:?}, fallback: {})",
                adapter_info.name,
                adapter_info.backend,
                power_preference,
                force_fallback_adapter
            )
            .into(),
        );

        let adapter_limits = adapter.limits();
        let required_limits = if backends.contains(wgpu::Backends::GL) {
            wgpu::Limits::downlevel_webgl2_defaults()
                .using_resolution(adapter_limits.clone())
                .using_alignment(adapter_limits)
        } else {
            wgpu::Limits::default()
                .using_resolution(adapter_limits.clone())
                .using_alignment(adapter_limits)
        };

        console::log_1(&format!("Requesting device with {}-compatible limits", backend_label).into());

        let (device, queue) = adapter
            .request_device(
                &wgpu::DeviceDescriptor {
                    label: Some("axiom-renderer-device"),
                    required_features: wgpu::Features::empty(),
                    required_limits,
                },
                None,
            )
            .await
            .map_err(|e| compact_error_message(&format!("Failed to create device: {:?}", e)))?;

        console::log_1(&"Device and queue created successfully".into());

        let size = (canvas.width(), canvas.height());
        let surface_caps = surface.get_capabilities(&adapter);
        let surface_format = surface_caps
            .formats
            .iter()
            .copied()
            .find(|format| format.is_srgb())
            .unwrap_or(surface_caps.formats[0]);
        let surface_config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format: surface_format,
            width: size.0,
            height: size.1,
            present_mode: wgpu::PresentMode::Fifo,
            alpha_mode: wgpu::CompositeAlphaMode::Auto,
            view_formats: vec![],
            desired_maximum_frame_latency: 2,
        };
        surface.configure(&device, &surface_config);

        console::log_1(
            &format!(
                "✅ Renderer initialized successfully ({}x{}, format: {:?}, backend: {})",
                size.0,
                size.1,
                surface_config.format,
                backend_label
            )
            .into(),
        );

        Ok(Self {
            device,
            queue,
            surface: Some(surface),
            surface_config: Some(surface_config),
        })
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub async fn new_headless() -> Result<Self, String> {
        // Native headless backend (for CLI screenshot generation)
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::PRIMARY,
            ..Default::default()
        });

        let adapter = instance.request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::HighPerformance,
            compatible_surface: None,
            force_fallback_adapter: false,
        })
        .await
        .ok_or("Failed to find GPU adapter")?;

        let (device, queue) = adapter.request_device(&wgpu::DeviceDescriptor {
            label: Some("axiom-renderer-device-headless"),
            required_features: wgpu::Features::empty(),
            required_limits: wgpu::Limits::default(),
        }, None)
        .await
        .map_err(|e| format!("Failed to create device: {:?}", e))?;

        Ok(Self {
            device,
            queue,
            surface: None,
            surface_config: None,
        })
    }
}
