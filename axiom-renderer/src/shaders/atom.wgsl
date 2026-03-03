// axiom-renderer/src/shaders/atom.wgsl
// Instanced atom rendering shader with per-atom colors and Blinn-Phong lighting

struct CameraUniforms {
    view_proj: mat4x4<f32>,
};

struct LightingUniforms {
    ambient: f32,
    diffuse: f32,
    specular: f32,
    _padding: f32,
};

@group(0) @binding(0)
var<uniform> camera: CameraUniforms;

@group(0) @binding(1)
var<uniform> lighting: LightingUniforms;

// Vertex attributes from base sphere mesh
struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
};

// Instance attributes (per-atom data)
struct InstanceInput {
    @location(2) instance_pos_radius: vec4<f32>,  // xyz = position, w = radius
    @location(3) instance_color: vec4<f32>,       // rgb = color, w = padding
};

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) world_normal: vec3<f32>,
    @location(1) world_position: vec3<f32>,
    @location(2) color: vec3<f32>,
};

@vertex
fn vs_main(vertex: VertexInput, instance: InstanceInput) -> VertexOutput {
    var out: VertexOutput;

    // Extract instance data
    let atom_position = instance.instance_pos_radius.xyz;
    let atom_radius = instance.instance_pos_radius.w;
    let atom_color = instance.instance_color.xyz;

    // Transform vertex position: scale by radius and translate to atom position
    let world_position = vertex.position * atom_radius + atom_position;

    // Transform normal (no scaling needed for unit sphere normals)
    out.world_normal = vertex.normal;
    out.world_position = world_position;

    // Project to clip space
    out.clip_position = camera.view_proj * vec4<f32>(world_position, 1.0);

    // Pass color to fragment shader
    out.color = atom_color;

    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    // Blinn-Phong shading model
    let light_dir = normalize(vec3<f32>(1.0, 1.0, 1.0));
    let normal = normalize(in.world_normal);

    // View direction (camera is at origin after view transform, approximate)
    let view_dir = normalize(-in.world_position);

    // Ambient component
    let ambient = in.color * lighting.ambient;

    // Diffuse component (Lambertian)
    let n_dot_l = max(dot(normal, light_dir), 0.0);
    let diffuse = in.color * lighting.diffuse * n_dot_l;

    // Specular component (Blinn-Phong)
    let half_dir = normalize(light_dir + view_dir);
    let n_dot_h = max(dot(normal, half_dir), 0.0);
    let spec_intensity = pow(n_dot_h, 32.0) * lighting.specular;
    let specular = vec3<f32>(spec_intensity, spec_intensity, spec_intensity);

    // Combine lighting components
    let final_color = ambient + diffuse + specular;

    return vec4<f32>(final_color, 1.0);
}
