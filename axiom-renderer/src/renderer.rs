// axiom-renderer/src/renderer.rs
// Main renderer struct that coordinates all components

use crate::{context::RenderContext, camera::Camera, pipeline::RenderPipeline, AtomData};
use crate::geometry::molecule::MoleculeGeometry;
use crate::geometry::{generate_sphere, generate_cylinder};
use crate::config::RenderConfig;
use crate::picking::{pick_atom, PickResult};
use crate::measurement::{MeasurementManager, Measurement};
use crate::molecule::Molecule;
use crate::animation::CameraAnimator;
use wgpu::util::DeviceExt;
use std::collections::HashSet;

pub struct Renderer {
    context: RenderContext,
    pub camera: Camera,
    pipeline: RenderPipeline,
    bond_pipeline: wgpu::RenderPipeline,
    // Configuration
    pub config: RenderConfig,
    // Camera animation
    pub animator: CameraAnimator,
    // Molecule data
    molecule: Option<Molecule>,
    // Geometry buffers
    geometry: Option<MoleculeGeometry>,
    atom_instance_buffer: Option<wgpu::Buffer>,
    bond_instance_buffer: Option<wgpu::Buffer>,
    // Mesh buffers (shared by all instances)
    sphere_vertex_buffer: wgpu::Buffer,
    sphere_index_buffer: wgpu::Buffer,
    sphere_index_count: u32,
    // Bond rendering (cylinder mesh)
    cylinder_vertex_buffer: wgpu::Buffer,
    cylinder_index_buffer: wgpu::Buffer,
    cylinder_index_count: u32,
    // Selection state
    selected_atoms: HashSet<usize>,
    // Measurements
    measurements: MeasurementManager,
}

struct PendingPngExport {
    output_buffer: wgpu::Buffer,
    render_width: u32,
    render_height: u32,
    padded_bytes_per_row: u32,
    unpadded_bytes_per_row: u32,
    target_width: u32,
    target_height: u32,
    ssaa: u32,
}

impl Renderer {
    #[cfg(target_arch = "wasm32")]
    pub async fn new(canvas: web_sys::HtmlCanvasElement) -> Result<Self, String> {
        let context = RenderContext::new_for_canvas(canvas).await?;
        let camera = Camera::new(
            context.surface_config.as_ref().unwrap().width,
            context.surface_config.as_ref().unwrap().height,
        );
        let pipeline = RenderPipeline::new(
            &context.device,
            context.surface_config.as_ref().unwrap().format,
        );

        // Create bond pipeline (uses same bind group layout as atom pipeline)
        let bond_pipeline = RenderPipeline::new_bond_pipeline(
            &context.device,
            context.surface_config.as_ref().unwrap().format,
            &pipeline.bind_group_layout,
        );

        // Create sphere mesh (for atoms)
        let (sphere_vertices, sphere_indices) = generate_sphere(16, 16);
        let sphere_vertex_buffer = context.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("sphere-vertex-buffer"),
            contents: bytemuck::cast_slice(&sphere_vertices),
            usage: wgpu::BufferUsages::VERTEX,
        });
        let sphere_index_buffer = context.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("sphere-index-buffer"),
            contents: bytemuck::cast_slice(&sphere_indices),
            usage: wgpu::BufferUsages::INDEX,
        });
        let sphere_index_count = sphere_indices.len() as u32;

        // Create cylinder mesh (for bonds)
        let (cylinder_vertices, cylinder_indices) = generate_cylinder(12);
        let cylinder_vertex_buffer = context.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("cylinder-vertex-buffer"),
            contents: bytemuck::cast_slice(&cylinder_vertices),
            usage: wgpu::BufferUsages::VERTEX,
        });
        let cylinder_index_buffer = context.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("cylinder-index-buffer"),
            contents: bytemuck::cast_slice(&cylinder_indices),
            usage: wgpu::BufferUsages::INDEX,
        });
        let cylinder_index_count = cylinder_indices.len() as u32;

        Ok(Self {
            context,
            camera,
            pipeline,
            bond_pipeline,
            config: RenderConfig::default(),
            animator: CameraAnimator::new(),
            molecule: None,
            geometry: None,
            atom_instance_buffer: None,
            bond_instance_buffer: None,
            sphere_vertex_buffer,
            sphere_index_buffer,
            sphere_index_count,
            cylinder_vertex_buffer,
            cylinder_index_buffer,
            cylinder_index_count,
            selected_atoms: HashSet::new(),
            measurements: MeasurementManager::new(),
        })
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub async fn new_headless(width: u32, height: u32) -> Result<Self, String> {
        let context = RenderContext::new_headless().await?;
        let camera = Camera::new(width, height);
        // For headless, use a default format
        let pipeline = RenderPipeline::new(
            &context.device,
            wgpu::TextureFormat::Rgba8UnormSrgb,
        );

        // Create bond pipeline (uses same bind group layout as atom pipeline)
        let bond_pipeline = RenderPipeline::new_bond_pipeline(
            &context.device,
            wgpu::TextureFormat::Rgba8UnormSrgb,
            &pipeline.bind_group_layout,
        );

        // Create sphere mesh (for atoms)
        let (sphere_vertices, sphere_indices) = generate_sphere(16, 16);
        let sphere_vertex_buffer = context.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("sphere-vertex-buffer"),
            contents: bytemuck::cast_slice(&sphere_vertices),
            usage: wgpu::BufferUsages::VERTEX,
        });
        let sphere_index_buffer = context.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("sphere-index-buffer"),
            contents: bytemuck::cast_slice(&sphere_indices),
            usage: wgpu::BufferUsages::INDEX,
        });
        let sphere_index_count = sphere_indices.len() as u32;

        // Create cylinder mesh (for bonds)
        let (cylinder_vertices, cylinder_indices) = generate_cylinder(12);
        let cylinder_vertex_buffer = context.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("cylinder-vertex-buffer"),
            contents: bytemuck::cast_slice(&cylinder_vertices),
            usage: wgpu::BufferUsages::VERTEX,
        });
        let cylinder_index_buffer = context.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("cylinder-index-buffer"),
            contents: bytemuck::cast_slice(&cylinder_indices),
            usage: wgpu::BufferUsages::INDEX,
        });
        let cylinder_index_count = cylinder_indices.len() as u32;

        Ok(Self {
            context,
            camera,
            pipeline,
            bond_pipeline,
            config: RenderConfig::default(),
            animator: CameraAnimator::new(),
            molecule: None,
            geometry: None,
            atom_instance_buffer: None,
            bond_instance_buffer: None,
            sphere_vertex_buffer,
            sphere_index_buffer,
            sphere_index_count,
            cylinder_vertex_buffer,
            cylinder_index_buffer,
            cylinder_index_count,
            selected_atoms: HashSet::new(),
            measurements: MeasurementManager::new(),
        })
    }

    /// Load a molecule into the renderer, creating GPU buffers for rendering
    pub fn load_molecule(&mut self, molecule: Molecule, geometry: MoleculeGeometry) {
        // Create instance buffers
        self.atom_instance_buffer = geometry.create_atom_buffer(&self.context.device);
        self.bond_instance_buffer = geometry.create_bond_buffer(&self.context.device);

        // Fit camera to molecule bounds
        let center = geometry.center();
        let size = geometry.diagonal();
        self.camera.look_at(center, size * 1.5);

        // Store molecule and geometry
        self.molecule = Some(molecule);
        self.geometry = Some(geometry);
    }

    /// Get reference to loaded geometry (for animation bounds calculation)
    pub fn get_geometry(&self) -> Option<&MoleculeGeometry> {
        self.geometry.as_ref()
    }

    pub fn render(&mut self, _atoms: &[AtomData]) -> Result<(), String> {
        // Update camera animation (assume 16ms frame time for 60 FPS)
        if self.animator.is_animating {
            let (new_pos, new_tgt, is_done) = self.animator.update(16.0);
            self.camera.eye = new_pos;
            self.camera.target = new_tgt;

            if is_done {
                self.animator.is_animating = false;
            }
        }

        // Skip rendering if no molecule is loaded
        if self.geometry.is_none() {
            return Ok(());
        }

        // Get current surface texture
        let surface = self.context.surface.as_ref()
            .ok_or("No surface available for rendering")?;

        let output = surface.get_current_texture()
            .map_err(|e| format!("Failed to get surface texture: {:?}", e))?;

        let view = output.texture.create_view(&wgpu::TextureViewDescriptor::default());

        // Create camera uniform buffer (temporary - will be refactored to persistent buffer)
        let view_proj = self.camera.view_projection_matrix();
        let camera_uniform_data: [[f32; 4]; 4] = view_proj.to_cols_array_2d();
        let camera_uniform_buffer = self.context.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("camera-uniform-buffer-temp"),
            contents: bytemuck::cast_slice(&camera_uniform_data),
            usage: wgpu::BufferUsages::UNIFORM,
        });

        // Create lighting uniform buffer
        let lighting_data = self.config.lighting.to_uniform_data();
        let lighting_uniform_buffer = self.context.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("lighting-uniform-buffer-temp"),
            contents: bytemuck::cast_slice(&lighting_data),
            usage: wgpu::BufferUsages::UNIFORM,
        });

        let camera_bind_group = self.context.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("camera-lighting-bind-group-temp"),
            layout: &self.pipeline.bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: camera_uniform_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: lighting_uniform_buffer.as_entire_binding(),
                },
            ],
        });

        // Create depth texture (temporary - will be refactored to persistent texture)
        let depth_texture = self.context.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("depth-texture-temp"),
            size: wgpu::Extent3d {
                width: self.context.surface_config.as_ref().unwrap().width,
                height: self.context.surface_config.as_ref().unwrap().height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Depth24Plus,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            view_formats: &[],
        });
        let depth_view = depth_texture.create_view(&wgpu::TextureViewDescriptor::default());

        let mut encoder = self.context.device.create_command_encoder(
            &wgpu::CommandEncoderDescriptor {
                label: Some("render-encoder"),
            }
        );

        {
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("render-pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color {
                            r: self.config.background_color[0] as f64,
                            g: self.config.background_color[1] as f64,
                            b: self.config.background_color[2] as f64,
                            a: self.config.background_color[3] as f64,
                        }),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: Some(wgpu::RenderPassDepthStencilAttachment {
                    view: &depth_view,
                    depth_ops: Some(wgpu::Operations {
                        load: wgpu::LoadOp::Clear(1.0),
                        store: wgpu::StoreOp::Store,
                    }),
                    stencil_ops: None,
                }),
                timestamp_writes: None,
                occlusion_query_set: None,
            });

            render_pass.set_pipeline(&self.pipeline.pipeline);
            render_pass.set_bind_group(0, &camera_bind_group, &[]);

            // Render atoms using instanced rendering
            if let (Some(ref geom), Some(ref atom_buffer)) = (&self.geometry, &self.atom_instance_buffer) {
                if !geom.atom_instances.is_empty() {
                    render_pass.set_vertex_buffer(0, self.sphere_vertex_buffer.slice(..));
                    render_pass.set_vertex_buffer(1, atom_buffer.slice(..));
                    render_pass.set_index_buffer(self.sphere_index_buffer.slice(..), wgpu::IndexFormat::Uint16);
                    render_pass.draw_indexed(
                        0..self.sphere_index_count,
                        0,
                        0..geom.atom_instances.len() as u32,
                    );
                }
            }

            // Render bonds using instanced cylinder rendering
            if let (Some(ref geom), Some(ref bond_buffer)) = (&self.geometry, &self.bond_instance_buffer) {
                if !geom.bond_instances.is_empty() {
                    render_pass.set_pipeline(&self.bond_pipeline);
                    render_pass.set_bind_group(0, &camera_bind_group, &[]);
                    render_pass.set_vertex_buffer(0, self.cylinder_vertex_buffer.slice(..));
                    render_pass.set_vertex_buffer(1, bond_buffer.slice(..));
                    render_pass.set_index_buffer(self.cylinder_index_buffer.slice(..), wgpu::IndexFormat::Uint16);
                    render_pass.draw_indexed(
                        0..self.cylinder_index_count,
                        0,
                        0..geom.bond_instances.len() as u32,
                    );
                }
            }
        }

        self.context.queue.submit(std::iter::once(encoder.finish()));
        output.present();

        Ok(())
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        if let Some(ref mut config) = self.context.surface_config {
            config.width = width;
            config.height = height;
            if let Some(ref surface) = self.context.surface {
                surface.configure(&self.context.device, config);
            }
        }
        self.camera.set_aspect(width as f32 / height as f32);
    }

    pub fn rotate_camera(&mut self, delta_x: f32, delta_y: f32) {
        self.camera.rotate(delta_x, delta_y);
    }

    pub fn zoom_camera(&mut self, delta: f32) {
        self.camera.zoom(delta);
    }

    pub fn pan_camera(&mut self, delta_x: f32, delta_y: f32) {
        self.camera.pan(delta_x, delta_y);
    }

    pub fn fit_camera_to_scene(&mut self) {
        if let Some(geometry) = &self.geometry {
            let center = geometry.center();
            let size = geometry.diagonal().max(1.0);
            self.camera.look_at(center, size * 1.5);
        }
    }

    pub fn replace_geometry(&mut self, geometry: MoleculeGeometry) {
        self.atom_instance_buffer = geometry.create_atom_buffer(&self.context.device);
        self.bond_instance_buffer = geometry.create_bond_buffer(&self.context.device);
        self.geometry = Some(geometry);
    }

    pub fn max_texture_dimension_2d(&self) -> u32 {
        self.context.device.limits().max_texture_dimension_2d
    }

    /// Pick atom at screen coordinates using ray casting
    ///
    /// # Arguments
    /// * `x` - Screen X coordinate (0 = left edge)
    /// * `y` - Screen Y coordinate (0 = top edge)
    ///
    /// # Returns
    /// Information about the picked atom, or None if no atom was hit
    pub fn pick_atom_at_screen(&self, x: f32, y: f32) -> Option<PickResult> {
        let molecule = self.molecule.as_ref()?;

        // Get canvas dimensions
        let (width, height) = if let Some(ref config) = self.context.surface_config {
            (config.width, config.height)
        } else {
            // Fallback for headless rendering
            (800, 600)
        };

        // Build atom list (position, radius, element)
        // Convert [f32; 3] to Vec3
        let atoms: Vec<_> = molecule.atoms.iter()
            .map(|atom| (glam::Vec3::from(atom.position), atom.radius, atom.element.clone()))
            .collect();

        // Get view-projection matrix
        let view_proj = self.camera.view_projection_matrix();

        // Perform ray casting
        pick_atom(x, y, width, height, view_proj, &atoms)
    }

    /// Select an atom by index
    pub fn select_atom(&mut self, index: usize) {
        self.selected_atoms.insert(index);
    }

    /// Deselect an atom by index
    pub fn deselect_atom(&mut self, index: usize) {
        self.selected_atoms.remove(&index);
    }

    /// Clear all atom selections
    pub fn clear_selection(&mut self) {
        self.selected_atoms.clear();
    }

    /// Get the list of selected atom indices
    pub fn get_selection(&self) -> Vec<usize> {
        self.selected_atoms.iter().copied().collect()
    }

    /// Check if an atom is selected
    pub fn is_selected(&self, index: usize) -> bool {
        self.selected_atoms.contains(&index)
    }

    /// Get the total number of atoms in the loaded molecule
    pub fn get_atom_count(&self) -> usize {
        self.molecule.as_ref()
            .map(|m| m.atoms.len())
            .unwrap_or(0)
    }

    /// Create a distance measurement between two atoms
    ///
    /// # Returns
    /// ID of the created measurement, or None if atoms don't exist
    pub fn create_distance_measurement(&mut self, atom1: usize, atom2: usize) -> Option<usize> {
        let molecule = self.molecule.as_ref()?;

        let a1 = molecule.atoms.get(atom1)?;
        let a2 = molecule.atoms.get(atom2)?;

        Some(self.measurements.add_distance(
            atom1, atom2,
            glam::Vec3::from(a1.position), glam::Vec3::from(a2.position),
            &a1.element, &a2.element
        ))
    }

    /// Create an angle measurement between three atoms
    ///
    /// # Returns
    /// ID of the created measurement, or None if atoms don't exist
    pub fn create_angle_measurement(
        &mut self,
        atom1: usize,
        atom2: usize,
        atom3: usize,
    ) -> Option<usize> {
        let molecule = self.molecule.as_ref()?;

        let a1 = molecule.atoms.get(atom1)?;
        let a2 = molecule.atoms.get(atom2)?;
        let a3 = molecule.atoms.get(atom3)?;

        Some(self.measurements.add_angle(
            atom1, atom2, atom3,
            glam::Vec3::from(a1.position), glam::Vec3::from(a2.position), glam::Vec3::from(a3.position),
            &a1.element, &a2.element, &a3.element
        ))
    }

    /// Delete a measurement by ID
    pub fn delete_measurement(&mut self, id: usize) {
        self.measurements.remove(id);
    }

    /// Get all measurements
    pub fn get_measurements(&self) -> &[Measurement] {
        self.measurements.get_all()
    }

    /// Clear all measurements
    pub fn clear_measurements(&mut self) {
        self.measurements.clear();
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub fn export_png(
        &self,
        width: u32,
        height: u32,
        quality: crate::export::RenderQuality,
    ) -> Result<Vec<u8>, String> {
        let pending = self.submit_png_export(width, height, quality)?;
        let rgba = Self::read_output_buffer(
            &self.context.device,
            &pending.output_buffer,
            pending.render_width,
            pending.render_height,
            pending.padded_bytes_per_row,
            pending.unpadded_bytes_per_row,
        )?;

        let final_rgba = if pending.ssaa > 1 {
            Self::downsample_rgba(
                &rgba,
                pending.render_width,
                pending.render_height,
                pending.target_width,
                pending.target_height,
            )
        } else {
            rgba
        };

        Self::encode_png_rgba(&final_rgba, pending.target_width, pending.target_height)
    }

    #[cfg(target_arch = "wasm32")]
    pub async fn export_png(
        &self,
        width: u32,
        height: u32,
        quality: crate::export::RenderQuality,
    ) -> Result<Vec<u8>, String> {
        let pending = self.submit_png_export(width, height, quality)?;
        let rgba = Self::read_output_buffer_async(
            &self.context.device,
            &pending.output_buffer,
            pending.render_width,
            pending.render_height,
            pending.padded_bytes_per_row,
            pending.unpadded_bytes_per_row,
        )
        .await?;

        let final_rgba = if pending.ssaa > 1 {
            Self::downsample_rgba(
                &rgba,
                pending.render_width,
                pending.render_height,
                pending.target_width,
                pending.target_height,
            )
        } else {
            rgba
        };

        Self::encode_png_rgba(&final_rgba, pending.target_width, pending.target_height)
    }

    fn submit_png_export(
        &self,
        width: u32,
        height: u32,
        quality: crate::export::RenderQuality,
    ) -> Result<PendingPngExport, String> {
        let geometry = self
            .geometry
            .as_ref()
            .ok_or_else(|| "No structure loaded".to_string())?;

        let ssaa = quality.ssaa_multiplier().max(1);
        let render_width = width.saturating_mul(ssaa);
        let render_height = height.saturating_mul(ssaa);
        let max_dimension = self.context.device.limits().max_texture_dimension_2d;

        if render_width > max_dimension || render_height > max_dimension {
            return Err(format!(
                "Export size {}x{} at {}x SSAA exceeds this GPU limit of {}px. Lower the resolution or quality preset.",
                width,
                height,
                ssaa,
                max_dimension,
            ));
        }

        let surface_format = self
            .context
            .surface_config
            .as_ref()
            .map(|config| config.format)
            .unwrap_or(wgpu::TextureFormat::Rgba8UnormSrgb);

        let color_texture = self.context.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("png-export-color"),
            size: wgpu::Extent3d {
                width: render_width,
                height: render_height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: surface_format,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::COPY_SRC,
            view_formats: &[],
        });
        let color_view = color_texture.create_view(&wgpu::TextureViewDescriptor::default());

        let depth_texture = self.context.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("png-export-depth"),
            size: wgpu::Extent3d {
                width: render_width,
                height: render_height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Depth24Plus,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            view_formats: &[],
        });
        let depth_view = depth_texture.create_view(&wgpu::TextureViewDescriptor::default());

        let mut export_camera = self.camera.clone();
        export_camera.set_aspect(render_width as f32 / render_height as f32);
        let view_proj = export_camera.view_projection_matrix();
        let camera_uniform_data: [[f32; 4]; 4] = view_proj.to_cols_array_2d();
        let camera_uniform_buffer = self.context.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("png-export-camera-buffer"),
            contents: bytemuck::cast_slice(&camera_uniform_data),
            usage: wgpu::BufferUsages::UNIFORM,
        });

        let lighting_data = self.config.lighting.to_uniform_data();
        let lighting_uniform_buffer = self.context.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("png-export-lighting-buffer"),
            contents: bytemuck::cast_slice(&lighting_data),
            usage: wgpu::BufferUsages::UNIFORM,
        });

        let camera_bind_group = self.context.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("png-export-bind-group"),
            layout: &self.pipeline.bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: camera_uniform_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: lighting_uniform_buffer.as_entire_binding(),
                },
            ],
        });

        let mut encoder = self.context.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("png-export-encoder"),
        });

        {
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("png-export-render-pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &color_view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color {
                            r: self.config.background_color[0] as f64,
                            g: self.config.background_color[1] as f64,
                            b: self.config.background_color[2] as f64,
                            a: self.config.background_color[3] as f64,
                        }),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: Some(wgpu::RenderPassDepthStencilAttachment {
                    view: &depth_view,
                    depth_ops: Some(wgpu::Operations {
                        load: wgpu::LoadOp::Clear(1.0),
                        store: wgpu::StoreOp::Store,
                    }),
                    stencil_ops: None,
                }),
                timestamp_writes: None,
                occlusion_query_set: None,
            });

            render_pass.set_pipeline(&self.pipeline.pipeline);
            render_pass.set_bind_group(0, &camera_bind_group, &[]);

            if let Some(atom_buffer) = &self.atom_instance_buffer {
                if !geometry.atom_instances.is_empty() {
                    render_pass.set_vertex_buffer(0, self.sphere_vertex_buffer.slice(..));
                    render_pass.set_vertex_buffer(1, atom_buffer.slice(..));
                    render_pass.set_index_buffer(self.sphere_index_buffer.slice(..), wgpu::IndexFormat::Uint16);
                    render_pass.draw_indexed(
                        0..self.sphere_index_count,
                        0,
                        0..geometry.atom_instances.len() as u32,
                    );
                }
            }

            if let Some(bond_buffer) = &self.bond_instance_buffer {
                if !geometry.bond_instances.is_empty() {
                    render_pass.set_pipeline(&self.bond_pipeline);
                    render_pass.set_bind_group(0, &camera_bind_group, &[]);
                    render_pass.set_vertex_buffer(0, self.cylinder_vertex_buffer.slice(..));
                    render_pass.set_vertex_buffer(1, bond_buffer.slice(..));
                    render_pass.set_index_buffer(self.cylinder_index_buffer.slice(..), wgpu::IndexFormat::Uint16);
                    render_pass.draw_indexed(
                        0..self.cylinder_index_count,
                        0,
                        0..geometry.bond_instances.len() as u32,
                    );
                }
            }
        }

        let bytes_per_pixel = 4;
        let unpadded_bytes_per_row = render_width * bytes_per_pixel;
        let padded_bytes_per_row =
            unpadded_bytes_per_row.div_ceil(wgpu::COPY_BYTES_PER_ROW_ALIGNMENT)
                * wgpu::COPY_BYTES_PER_ROW_ALIGNMENT;

        let output_buffer = self.context.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("png-export-output-buffer"),
            size: (padded_bytes_per_row * render_height) as u64,
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });

        encoder.copy_texture_to_buffer(
            wgpu::ImageCopyTexture {
                texture: &color_texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            wgpu::ImageCopyBuffer {
                buffer: &output_buffer,
                layout: wgpu::ImageDataLayout {
                    offset: 0,
                    bytes_per_row: Some(padded_bytes_per_row),
                    rows_per_image: Some(render_height),
                },
            },
            wgpu::Extent3d {
                width: render_width,
                height: render_height,
                depth_or_array_layers: 1,
            },
        );

        self.context.queue.submit(std::iter::once(encoder.finish()));

        Ok(PendingPngExport {
            output_buffer,
            render_width,
            render_height,
            padded_bytes_per_row,
            unpadded_bytes_per_row,
            target_width: width,
            target_height: height,
            ssaa,
        })
    }

    #[cfg(not(target_arch = "wasm32"))]
    fn read_output_buffer(
        device: &wgpu::Device,
        output_buffer: &wgpu::Buffer,
        width: u32,
        height: u32,
        padded_bytes_per_row: u32,
        unpadded_bytes_per_row: u32,
    ) -> Result<Vec<u8>, String> {
        let buffer_slice = output_buffer.slice(..);
        let (tx, rx) = std::sync::mpsc::channel();
        buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
            tx.send(result).ok();
        });

        device.poll(wgpu::Maintain::Wait);
        rx.recv()
            .map_err(|e| format!("Failed to receive buffer map result: {}", e))?
            .map_err(|e| format!("Buffer mapping failed: {:?}", e))?;

        let data = buffer_slice.get_mapped_range();
        let mut rgba = Vec::with_capacity((width * height * 4) as usize);

        for row in 0..height {
            let offset = (row * padded_bytes_per_row) as usize;
            let row_data = &data[offset..offset + unpadded_bytes_per_row as usize];
            rgba.extend_from_slice(row_data);
        }

        drop(data);
        output_buffer.unmap();
        Ok(rgba)
    }

    #[cfg(target_arch = "wasm32")]
    async fn read_output_buffer_async(
        device: &wgpu::Device,
        output_buffer: &wgpu::Buffer,
        width: u32,
        height: u32,
        padded_bytes_per_row: u32,
        unpadded_bytes_per_row: u32,
    ) -> Result<Vec<u8>, String> {
        use std::cell::RefCell;
        use std::rc::Rc;

        let buffer_slice = output_buffer.slice(..);
        let map_status = Rc::new(RefCell::new(None::<Result<(), String>>));
        let map_status_for_callback = Rc::clone(&map_status);

        buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
            *map_status_for_callback.borrow_mut() =
                Some(result.map_err(|e| format!("Buffer mapping failed: {:?}", e)));
        });

        loop {
            if let Some(result) = map_status.borrow_mut().take() {
                result?;
                break;
            }

            device.poll(wgpu::Maintain::Poll);
            gloo_timers::future::TimeoutFuture::new(0).await;
        }

        let data = buffer_slice.get_mapped_range();
        let mut rgba = Vec::with_capacity((width * height * 4) as usize);

        for row in 0..height {
            let offset = (row * padded_bytes_per_row) as usize;
            let row_data = &data[offset..offset + unpadded_bytes_per_row as usize];
            rgba.extend_from_slice(row_data);
        }

        drop(data);
        output_buffer.unmap();
        Ok(rgba)
    }

    fn downsample_rgba(
        data: &[u8],
        src_width: u32,
        src_height: u32,
        dst_width: u32,
        dst_height: u32,
    ) -> Vec<u8> {
        let scale_x = (src_width / dst_width).max(1);
        let scale_y = (src_height / dst_height).max(1);
        let mut result = vec![0u8; (dst_width * dst_height * 4) as usize];

        for y in 0..dst_height {
            for x in 0..dst_width {
                let mut r = 0u32;
                let mut g = 0u32;
                let mut b = 0u32;
                let mut a = 0u32;
                let mut count = 0u32;

                for sy in 0..scale_y {
                    for sx in 0..scale_x {
                        let src_x = x * scale_x + sx;
                        let src_y = y * scale_y + sy;
                        let src_idx = ((src_y * src_width + src_x) * 4) as usize;
                        r += data[src_idx] as u32;
                        g += data[src_idx + 1] as u32;
                        b += data[src_idx + 2] as u32;
                        a += data[src_idx + 3] as u32;
                        count += 1;
                    }
                }

                let dst_idx = ((y * dst_width + x) * 4) as usize;
                result[dst_idx] = (r / count) as u8;
                result[dst_idx + 1] = (g / count) as u8;
                result[dst_idx + 2] = (b / count) as u8;
                result[dst_idx + 3] = (a / count) as u8;
            }
        }

        result
    }

    fn encode_png_rgba(data: &[u8], width: u32, height: u32) -> Result<Vec<u8>, String> {
        let mut png_data = Vec::new();
        {
            let mut encoder = png::Encoder::new(&mut png_data, width, height);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);

            let mut writer = encoder
                .write_header()
                .map_err(|e| format!("Failed to write PNG header: {}", e))?;

            writer
                .write_image_data(data)
                .map_err(|e| format!("Failed to write PNG data: {}", e))?;
        }

        Ok(png_data)
    }
}
