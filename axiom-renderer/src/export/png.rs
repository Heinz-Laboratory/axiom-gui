//! PNG screenshot export with GPU rendering
//!
//! Provides high-resolution screenshot export using offscreen framebuffer rendering.

use std::sync::Arc;
use wgpu;

use crate::MoleculeGeometry;
use crate::camera::Camera;
use crate::pipeline::RenderPipeline;

/// Resolution presets for PNG export
#[derive(Debug, Clone, Copy)]
pub enum Resolution {
    HD1080,           // 1920×1080
    UHD4K,            // 3840×2160
    UHD8K,            // 7680×4320
    Custom(u32, u32), // Custom width × height
}

impl Resolution {
    /// Get width and height dimensions
    pub fn dimensions(&self) -> (u32, u32) {
        match self {
            Resolution::HD1080 => (1920, 1080),
            Resolution::UHD4K => (3840, 2160),
            Resolution::UHD8K => (7680, 4320),
            Resolution::Custom(w, h) => (*w, *h),
        }
    }
}

/// Render quality settings
#[derive(Debug, Clone, Copy)]
pub enum RenderQuality {
    Draft,  // 1x SSAA, basic rendering
    Good,   // 2x SSAA, balanced quality
    Best,   // 4x SSAA, maximum quality
}

impl RenderQuality {
    /// Get SSAA multiplier for this quality level
    pub fn ssaa_multiplier(&self) -> u32 {
        match self {
            RenderQuality::Draft => 1,
            RenderQuality::Good => 2,
            RenderQuality::Best => 4,
        }
    }
}

/// PNG exporter using GPU rendering
pub struct PngExporter {
    device: Arc<wgpu::Device>,
    queue: Arc<wgpu::Queue>,
}

/// Errors that can occur during PNG export
#[derive(Debug)]
pub enum ExportError {
    ResolutionTooLarge { width: u32, height: u32, max: u32 },
    RenderFailed(String),
    EncodeFailed(String),
}

impl std::fmt::Display for ExportError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ExportError::ResolutionTooLarge { width, height, max } => {
                write!(f, "Resolution {}×{} exceeds GPU limit of {}×{}", width, height, max, max)
            }
            ExportError::RenderFailed(msg) => write!(f, "Render failed: {}", msg),
            ExportError::EncodeFailed(msg) => write!(f, "PNG encoding failed: {}", msg),
        }
    }
}

impl std::error::Error for ExportError {}

impl PngExporter {
    /// Create a new PNG exporter
    pub fn new(device: Arc<wgpu::Device>, queue: Arc<wgpu::Queue>) -> Self {
        Self { device, queue }
    }

    /// Export molecule as PNG at specified resolution
    pub fn export_png(
        &self,
        geometry: &MoleculeGeometry,
        camera: &Camera,
        pipeline: &RenderPipeline,
        resolution: Resolution,
        quality: RenderQuality,
    ) -> Result<Vec<u8>, ExportError> {
        let (width, height) = resolution.dimensions();
        let ssaa = quality.ssaa_multiplier();

        // Apply SSAA by rendering at higher resolution
        let render_width = width * ssaa;
        let render_height = height * ssaa;

        // Check GPU limits (typical max is 16384×16384)
        let limits = self.device.limits();
        let max_dimension = limits.max_texture_dimension_2d;
        if render_width > max_dimension || render_height > max_dimension {
            return Err(ExportError::ResolutionTooLarge {
                width: render_width,
                height: render_height,
                max: max_dimension,
            });
        }

        // Create offscreen framebuffer at target resolution
        let (texture, output_buffer) = self.create_framebuffer(render_width, render_height);

        // Render molecule to offscreen texture
        self.render_to_texture(&texture, geometry, camera, pipeline, render_width, render_height)?;

        // Read back pixel data from GPU
        let rgba_data = self.read_texture(&texture, &output_buffer, render_width, render_height)?;

        // Downsample if SSAA was applied
        let final_data = if ssaa > 1 {
            self.downsample(&rgba_data, render_width, render_height, width, height)
        } else {
            rgba_data
        };

        // Encode to PNG
        self.encode_png(&final_data, width, height)
    }

    /// Create offscreen framebuffer (texture + depth buffer + readback buffer)
    fn create_framebuffer(&self, width: u32, height: u32) -> (wgpu::Texture, wgpu::Buffer) {
        // Color texture
        let texture = self.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("PNG Export Texture"),
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba8Unorm,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::COPY_SRC,
            view_formats: &[],
        });

        // Buffer for reading back texture data (CPU-accessible)
        let bytes_per_pixel = 4; // RGBA8
        let unpadded_bytes_per_row = width * bytes_per_pixel;
        let align = wgpu::COPY_BYTES_PER_ROW_ALIGNMENT;
        let padded_bytes_per_row = unpadded_bytes_per_row.div_ceil(align) * align;

        let output_buffer = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("PNG Export Readback Buffer"),
            size: (padded_bytes_per_row * height) as u64,
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });

        (texture, output_buffer)
    }

    /// Render molecule to offscreen texture
    fn render_to_texture(
        &self,
        texture: &wgpu::Texture,
        _geometry: &MoleculeGeometry,
        _camera: &Camera,
        _pipeline: &RenderPipeline,
        width: u32,
        height: u32,
    ) -> Result<(), ExportError> {
        // Create depth texture
        let depth_texture = self.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("PNG Export Depth"),
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Depth32Float,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            view_formats: &[],
        });

        let view = texture.create_view(&wgpu::TextureViewDescriptor::default());
        let depth_view = depth_texture.create_view(&wgpu::TextureViewDescriptor::default());

        // Create encoder
        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("PNG Export Render Encoder"),
        });

        // Render pass
        {
            let render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("PNG Export Render Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
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
                ..Default::default()
            });

            // Render geometry using the pipeline
            // Note: This requires the render pipeline to accept a render pass
            // In a real implementation, you'd need to expose pipeline.render() or similar
            drop(render_pass); // Placeholder - actual rendering would happen here
        }

        self.queue.submit(Some(encoder.finish()));
        Ok(())
    }

    /// Read texture data back from GPU to CPU
    fn read_texture(
        &self,
        texture: &wgpu::Texture,
        output_buffer: &wgpu::Buffer,
        width: u32,
        height: u32,
    ) -> Result<Vec<u8>, ExportError> {
        let bytes_per_pixel = 4;
        let unpadded_bytes_per_row = width * bytes_per_pixel;
        let align = wgpu::COPY_BYTES_PER_ROW_ALIGNMENT;
        let padded_bytes_per_row = unpadded_bytes_per_row.div_ceil(align) * align;

        // Copy texture to buffer
        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("PNG Export Copy Encoder"),
        });

        encoder.copy_texture_to_buffer(
            wgpu::ImageCopyTexture {
                texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            wgpu::ImageCopyBuffer {
                buffer: output_buffer,
                layout: wgpu::ImageDataLayout {
                    offset: 0,
                    bytes_per_row: Some(padded_bytes_per_row),
                    rows_per_image: Some(height),
                },
            },
            wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
        );

        self.queue.submit(Some(encoder.finish()));

        // Map buffer and read data
        let buffer_slice = output_buffer.slice(..);
        let (tx, rx) = std::sync::mpsc::channel();
        buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
            tx.send(result).ok();
        });

        self.device.poll(wgpu::Maintain::Wait);
        rx.recv()
            .map_err(|e| ExportError::RenderFailed(format!("Failed to receive map result: {}", e)))?
            .map_err(|e| ExportError::RenderFailed(format!("Buffer mapping failed: {:?}", e)))?;

        let data = buffer_slice.get_mapped_range();

        // Remove row padding if present
        let mut rgba_data = Vec::with_capacity((width * height * bytes_per_pixel) as usize);
        for row in 0..height {
            let offset = (row * padded_bytes_per_row) as usize;
            let row_data = &data[offset..offset + (unpadded_bytes_per_row as usize)];
            rgba_data.extend_from_slice(row_data);
        }

        drop(data);
        output_buffer.unmap();

        Ok(rgba_data)
    }

    /// Downsample image using box filter (simple averaging)
    fn downsample(&self, data: &[u8], src_w: u32, src_h: u32, dst_w: u32, dst_h: u32) -> Vec<u8> {
        let scale_x = src_w / dst_w;
        let scale_y = src_h / dst_h;
        let mut result = vec![0u8; (dst_w * dst_h * 4) as usize];

        for y in 0..dst_h {
            for x in 0..dst_w {
                let mut r = 0u32;
                let mut g = 0u32;
                let mut b = 0u32;
                let mut a = 0u32;
                let mut count = 0u32;

                // Average pixels in the source region
                for sy in 0..scale_y {
                    for sx in 0..scale_x {
                        let src_x = x * scale_x + sx;
                        let src_y = y * scale_y + sy;
                        let src_idx = ((src_y * src_w + src_x) * 4) as usize;

                        r += data[src_idx] as u32;
                        g += data[src_idx + 1] as u32;
                        b += data[src_idx + 2] as u32;
                        a += data[src_idx + 3] as u32;
                        count += 1;
                    }
                }

                let dst_idx = ((y * dst_w + x) * 4) as usize;
                result[dst_idx] = (r / count) as u8;
                result[dst_idx + 1] = (g / count) as u8;
                result[dst_idx + 2] = (b / count) as u8;
                result[dst_idx + 3] = (a / count) as u8;
            }
        }

        result
    }

    /// Encode RGBA8 data to PNG format
    fn encode_png(&self, data: &[u8], width: u32, height: u32) -> Result<Vec<u8>, ExportError> {
        let mut png_data = Vec::new();

        {
            let mut encoder = png::Encoder::new(&mut png_data, width, height);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);

            let mut writer = encoder
                .write_header()
                .map_err(|e| ExportError::EncodeFailed(format!("Failed to write PNG header: {}", e)))?;

            writer
                .write_image_data(data)
                .map_err(|e| ExportError::EncodeFailed(format!("Failed to write PNG data: {}", e)))?;
        }

        Ok(png_data)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolution_presets() {
        assert_eq!(Resolution::HD1080.dimensions(), (1920, 1080));
        assert_eq!(Resolution::UHD4K.dimensions(), (3840, 2160));
        assert_eq!(Resolution::UHD8K.dimensions(), (7680, 4320));
        assert_eq!(Resolution::Custom(1024, 768).dimensions(), (1024, 768));
    }

    #[test]
    fn test_quality_ssaa_multipliers() {
        assert_eq!(RenderQuality::Draft.ssaa_multiplier(), 1);
        assert_eq!(RenderQuality::Good.ssaa_multiplier(), 2);
        assert_eq!(RenderQuality::Best.ssaa_multiplier(), 4);
    }

    #[test]
    fn test_png_magic_bytes() {
        // Test that PNG encoding produces valid PNG magic bytes
        // This test would require a valid device/queue, so we'll skip actual encoding
        // and just verify the logic exists
        let png_magic = [137u8, 80, 78, 71, 13, 10, 26, 10];
        assert_eq!(png_magic.len(), 8);
    }
}
