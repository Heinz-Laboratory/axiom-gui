// axiom-renderer/src/context.rs
// GPU context initialization for both WASM and native targets

pub struct RenderContext {
    pub device: wgpu::Device,
    pub queue: wgpu::Queue,
    pub surface: Option<wgpu::Surface<'static>>,
    pub surface_config: Option<wgpu::SurfaceConfiguration>,
}

impl RenderContext {
    #[cfg(target_arch = "wasm32")]
    pub async fn new_for_canvas(canvas: web_sys::HtmlCanvasElement) -> Result<Self, String> {
        use web_sys::console;

        // Try WebGPU first, fallback to WebGL2 if not available
        console::log_1(&"Axiom Renderer: Initializing graphics backend...".into());

        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::BROWSER_WEBGPU | wgpu::Backends::GL,
            ..Default::default()
        });

        let surface = instance.create_surface(wgpu::SurfaceTarget::Canvas(canvas.clone()))
            .map_err(|e| {
                let msg = format!("Failed to create surface: {:?}", e);
                console::error_1(&msg.clone().into());
                msg
            })?;

        console::log_1(&"Surface created successfully".into());

        let adapter = instance.request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::HighPerformance,
            compatible_surface: Some(&surface),
            force_fallback_adapter: false,
        })
        .await
        .ok_or_else(|| {
            let msg = "Failed to find GPU adapter. Your browser may not support WebGPU or WebGL2.";
            console::error_1(&msg.into());
            msg.to_string()
        })?;

        let adapter_info = adapter.get_info();
        console::log_1(&format!(
            "GPU Adapter: {} (backend: {:?})",
            adapter_info.name,
            adapter_info.backend
        ).into());

        // CRITICAL FIX: Don't pass required_limits - just use defaults
        // wgpu 0.19 serializes Limits with fields (maxInterStageShaderComponents) that
        // Chrome WebGPU doesn't recognize yet. By NOT specifying limits, wgpu's WASM
        // bindings will negotiate with the browser and only use supported features.
        console::log_1(&"Requesting device with default limits (browser will decide)".into());

        let (device, queue) = adapter.request_device(&wgpu::DeviceDescriptor {
            label: Some("axiom-renderer-device"),
            required_features: wgpu::Features::empty(),
            required_limits: wgpu::Limits::downlevel_defaults(),  // Most conservative limits
        }, None)
        .await
        .map_err(|e| {
            let msg = format!("Failed to create device: {:?}", e);
            console::error_1(&msg.clone().into());
            msg
        })?;

        console::log_1(&"Device and queue created successfully".into());

        let size = (canvas.width(), canvas.height());
        let surface_caps = surface.get_capabilities(&adapter);
        let surface_config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format: surface_caps.formats[0],
            width: size.0,
            height: size.1,
            present_mode: wgpu::PresentMode::Fifo,  // VSync
            alpha_mode: wgpu::CompositeAlphaMode::Auto,
            view_formats: vec![],
            desired_maximum_frame_latency: 2,
        };
        surface.configure(&device, &surface_config);

        console::log_1(&format!(
            "✅ Renderer initialized successfully ({}x{}, format: {:?})",
            size.0, size.1, surface_config.format
        ).into());

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
