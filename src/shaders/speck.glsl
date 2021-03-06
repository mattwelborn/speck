#version 100
precision highp float;

attribute vec3 aPosition;

void main() {
    gl_Position = vec4(aPosition, 1.0);
}


// __split__


#version 100
precision highp float;

struct Sphere {
    vec3 position;
    vec3 color;
    float radius;
};

#define BIGNUM 1000000

uniform sampler2D uSphereData;

uniform vec2 uRes;
uniform vec2 uBottomLeft;
uniform vec2 uTopRight;

uniform vec4 uRand;

uniform mat4 uRotation;

uniform float uElementScale;
uniform float uScale;
uniform float uOffset;


uniform int uSpheresLength;

uniform int uSPP;

float SAMPLE_RADIUS = 1.0/uRes.x / uScale;
float TEXEL_SIZE = 1.0 / float(uSpheresLength);

Sphere getSphere(int index) {
    vec4 d0 = texture2D(uSphereData, vec2(TEXEL_SIZE * (float(index) + 0.0) + 0.5 * TEXEL_SIZE, 0.0));
    vec4 d1 = texture2D(uSphereData, vec2(TEXEL_SIZE * (float(index) + 1.0) + 0.5 * TEXEL_SIZE, 0.0));
    Sphere s;
    s.position = vec3(uRotation * vec4(d0.xyz, 1)) + vec3(0, 0, uOffset);
    s.color = vec3(d0.w, d1.xy);
    s.radius = d1.z * uElementScale;
    return s;
}

float raySphereIntersect(vec3 r0, vec3 rd, Sphere s) {
    float a = dot(rd, rd);
    vec3 s0_r0 = r0 - s.position;
    float b = 2.0 * dot(rd, s0_r0);
    float c = dot(s0_r0, s0_r0) - (s.radius * s.radius);
    if (b*b - 4.0*a*c < 0.0) {
        return -1.0;
    }
    return (-b - sqrt((b*b) - 4.0*a*c))/(2.0*a);
}

vec2 randv2=fract(cos((gl_FragCoord.xy+gl_FragCoord.yx*vec2(1000.0,1000.0))+uRand.xy)*10000.0);
vec2 rand2() {
    randv2+=vec2(1.0,1.0);
    return vec2(fract(sin(dot(randv2.xy ,vec2(12.9898,78.233))) * 43758.5453),
        fract(cos(dot(randv2.xy ,vec2(4.898,7.23))) * 23421.631));
}

vec3 cosineDirection(vec3 n) {
    vec2 r = rand2() * 6.283; 
    vec3 dr = vec3(sin(r.x) * vec2(sin(r.y), cos(r.y)), cos(r.x));
    return (dot(dr, n) < 0.0) ? -dr : dr;
}

void main() {
    vec4 color = vec4(0,0,0,0);
    for (int j = 0; j < BIGNUM; j++) {
        if (j >= uSPP) {
            break;
        }
        vec4 sample;
        vec3 r0 = vec3(uBottomLeft + (gl_FragCoord.xy/uRes) * (uTopRight - uBottomLeft), 0.0);
        r0.xy += (rand2()-0.5) * SAMPLE_RADIUS;
        float mint = 1000000.0;
        bool intersects = false;
        Sphere hit;
        for (int i = 0; i < BIGNUM; i+=2) {
            if (i >= uSpheresLength) {
                break;
            }
            Sphere s = getSphere(i);
            float t = raySphereIntersect(r0, vec3(0, 0, -1), s);
            if (t >= 0.0 && t < mint) {
                mint = t;
                sample = vec4(s.color, 1);
                intersects = true;
                hit = s;
            }
        }
        if (!intersects) {
            sample = vec4(0,0,0,0);
        } else {
            r0 = r0 + mint * vec3(0, 0, -1);
            vec3 normal = normalize(r0 - hit.position);
            vec3 rd = cosineDirection(normal);
            for (int i = 0; i < BIGNUM; i+=2) {
                if (i >= uSpheresLength) {
                    break;
                }
                float t = raySphereIntersect(r0, rd, getSphere(i));
                if (t >= 0.0) {
                    sample = vec4(0,0,0,1);
                    break;
                }
            }
        }
        color += sample;
    }

    gl_FragColor = color / float(uSPP);
}
