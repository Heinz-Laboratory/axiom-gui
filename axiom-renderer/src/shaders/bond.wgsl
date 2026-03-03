// axiom-renderer/src/shaders/bond.wgsl
// Instanced bond rendering shader with cylinder orientation and per-bond colors

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

// Vertex attributes from base cylinder mesh (unit cylinder along Y-axis)
struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
};

// Instance attributes (per-bond data)
// Layout matches BondInstance struct from geometry/molecule.rs
struct InstanceInput {
    @location(2) start_radius: vec4<f32>,  // xyz = start position, w = radius
    @location(3) end_length: vec4<f32>,    // xyz = end position, w = length (unused in shader)
    @location(4) color_pad: vec4<f32>,     // rgb = color, w = padding
};

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) world_normal: vec3<f32>,
    @location(1) world_position: vec3<f32>,
    @location(2) color: vec3<f32>,
};

// Helper function to create rotation matrix that aligns Y-axis with direction vector
fn align_y_to_dir(dir: vec3<f32>) -> mat3x3<f32> {
    // Normalize direction
    let up = normalize(dir);

    // Choose a vector not parallel to 'up' for cross product
    var arbitrary = vec3<f32>(0.0, 1.0, 0.0);
    if (abs(up.y) > 0.99) {
        arbitrary = vec3<f32>(1.0, 0.0, 0.0);
    }

    // Build orthonormal basis
    let right = normalize(cross(arbitrary, up));
    let forward = cross(up, right);

    // Rotation matrix with columns: [right, up, forward]
    return mat3x3<f32>(
        right.x, up.x, forward.x,
        right.y, up.y, forward.y,
        right.z, up.z, forward.z
    );
}

@vertex
fn vs_main(vertex: VertexInput, instance: InstanceInput) -> VertexOutput {
    var out: VertexOutput;

    // Extract instance data
    let bond_start = instance.start_radius.xyz;
    let bond_radius = instance.start_radius.w;
    let bond_end = instance.end_length.xyz;
    let bond_color = instance.color_pad.xyz;

    // Calculate bond properties
    let bond_dir = bond_end - bond_start;
    let bond_length = length(bond_dir);
    let bond_midpoint = (bond_start + bond_end) * 0.5;

    // Create transformation matrix
    let rotation = align_y_to_dir(bond_dir);

    // Scale vertex: radius in XZ, length in Y
    let scaled_vertex = vec3<f32>(
        vertex.position.x * bond_radius,
        vertex.position.y * bond_length,
        vertex.position.z * bond_radius
    );

    // Rotate and translate
    let rotated_vertex = rotation * scaled_vertex;
    let world_position = rotated_vertex + bond_midpoint;

    // Transform normal (rotation only, no scaling)
    out.world_normal = rotation * vertex.normal;
    out.world_position = world_position;

    // Project to clip space
    out.clip_position = camera.view_proj * vec4<f32>(world_position, 1.0);

    // Pass color to fragment shader
    out.color = bond_color;

    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    // Blinn-Phong shading model (same as atoms)
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
