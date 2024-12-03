/**
 * @Instructions
 * 		@task1 : Complete the setTexture function to handle non power of 2 sized textures
 * 		@task2 : Implement the lighting by modifying the fragment shader, constructor,
 *      @task3: 
 *      @task4: 
 * 		setMesh, draw, setAmbientLight, setSpecularLight and enableLighting functions 
 */


function GetModelViewProjection(projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY) {
	
	var trans1 = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];
	var rotatXCos = Math.cos(rotationX);
	var rotatXSin = Math.sin(rotationX);

	var rotatYCos = Math.cos(rotationY);
	var rotatYSin = Math.sin(rotationY);

	var rotatx = [
		1, 0, 0, 0,
		0, rotatXCos, -rotatXSin, 0,
		0, rotatXSin, rotatXCos, 0,
		0, 0, 0, 1
	]

	var rotaty = [
		rotatYCos, 0, -rotatYSin, 0,
		0, 1, 0, 0,
		rotatYSin, 0, rotatYCos, 0,
		0, 0, 0, 1
	]

	var test1 = MatrixMult(rotaty, rotatx);
	var test2 = MatrixMult(trans1, test1);
	var mvp = MatrixMult(projectionMatrix, test2);

	return mvp;
}


class MeshDrawer {
	// The constructor is a good place for taking care of the necessary initializations.
	constructor() {
		this.prog = InitShaderProgram(meshVS, meshFS);
		this.mvpLoc = gl.getUniformLocation(this.prog, 'mvp');
		this.showTexLoc = gl.getUniformLocation(this.prog, 'showTex');

		this.colorLoc = gl.getUniformLocation(this.prog, 'color');

		this.vertPosLoc = gl.getAttribLocation(this.prog, 'pos');
		this.texCoordLoc = gl.getAttribLocation(this.prog, 'texCoord');


		this.vertbuffer = gl.createBuffer();
		this.texbuffer = gl.createBuffer();

		this.numTriangles = 0;

		/**
		 * @Task2 : You should initialize the required variables for lighting here
		 */
		
		// Add lighting-related uniform locations
		this.lightPosLoc = gl.getUniformLocation(this.prog, 'lightPos');
		this.ambientLoc = gl.getUniformLocation(this.prog, 'ambient');
		this.enableLightingLoc = gl.getUniformLocation(this.prog, 'enableLighting');
		this.normalLoc = gl.getAttribLocation(this.prog, 'normal');
		
		// Create buffer for normals
		this.normBuffer = gl.createBuffer();
		
		// Initialize lighting state
		this.isLightingEnabled = false;
		this.ambientIntensity = 0.1; // default ambient light intensity

		// Add specular lighting uniforms
		this.specularIntensityLoc = gl.getUniformLocation(this.prog, 'specularIntensity');
		this.viewPosLoc = gl.getUniformLocation(this.prog, 'viewPos');
		this.shininessLoc = gl.getUniformLocation(this.prog, 'shininess');
		
		// Initialize specular parameters
		this.specularIntensity = 0.5;
		this.shininess = 32.0;
	}

	setMesh(vertPos, texCoords, normalCoords) {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		// update texture coordinates
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		this.numTriangles = vertPos.length / 3;

		/**
		 * @Task2 : You should update the rest of this function to handle the lighting
		 */

		// Update normal coordinates
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalCoords), gl.STATIC_DRAW);
	}

	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw(trans) {
		gl.useProgram(this.prog);

		gl.uniformMatrix4fv(this.mvpLoc, false, trans);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.enableVertexAttribArray(this.vertPosLoc);
		gl.vertexAttribPointer(this.vertPosLoc, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
		gl.enableVertexAttribArray(this.texCoordLoc);
		gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, 0);

		// Set up normals
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
		gl.enableVertexAttribArray(this.normalLoc);
		gl.vertexAttribPointer(this.normalLoc, 3, gl.FLOAT, false, 0, 0);
		
		// Update light position and specular parameters
		gl.uniform3f(this.lightPosLoc, lightX, lightY, 1.0);
		gl.uniform3f(this.viewPosLoc, 0.0, 0.0, 5.0);
		gl.uniform1f(this.shininessLoc, this.shininess);
		gl.uniform1f(this.specularIntensityLoc, this.specularIntensity);
		
		updateLightPos();

		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}

	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture(img) {
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);

		// Upload the image data to the texture
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,  // Changed from RGB to RGBA
			gl.RGBA,  // Changed from RGB to RGBA
			gl.UNSIGNED_BYTE,
			img
		);

		// Set texture parameters regardless of image size
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		// Generate mipmaps only for power-of-2 textures
		if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		}

		gl.useProgram(this.prog);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		const sampler = gl.getUniformLocation(this.prog, 'tex');
		gl.uniform1i(sampler, 0);
	}

	showTexture(show) {
		gl.useProgram(this.prog);
		gl.uniform1i(this.showTexLoc, show);
	}

	enableLighting(show) {
		gl.useProgram(this.prog);
		this.isLightingEnabled = show;
		gl.uniform1i(this.enableLightingLoc, show);
	}
	
	setAmbientLight(ambient) {
		gl.useProgram(this.prog);
		this.ambientIntensity = ambient;
		gl.uniform1f(this.ambientLoc, ambient);
	}

	setSpecularLight(intensity) {
		gl.useProgram(this.prog);
		this.specularIntensity = intensity;
		gl.uniform1f(this.specularIntensityLoc, intensity);
	}
}


function isPowerOf2(value) {
	return (value & (value - 1)) == 0;
}

function normalize(v, dst) {
	dst = dst || new Float32Array(3);
	var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
	// make sure we don't divide by 0.
	if (length > 0.00001) {
		dst[0] = v[0] / length;
		dst[1] = v[1] / length;
		dst[2] = v[2] / length;
	}
	return dst;
}

// Vertex shader source code
const meshVS = `
			attribute vec3 pos; 
			attribute vec2 texCoord; 
			attribute vec3 normal;

			uniform mat4 mvp; 

			varying vec2 v_texCoord; 
			varying vec3 v_normal; 
			varying vec3 v_fragPos;

			void main()
			{
				v_texCoord = texCoord;
				v_normal = normal;
				v_fragPos = pos;

				gl_Position = mvp * vec4(pos,1);
			}`;

// Fragment shader source code
/**
 * @Task2 : You should update the fragment shader to handle the lighting
 */
const meshFS = `
			precision mediump float;

			uniform bool showTex;
			uniform bool enableLighting;
			uniform sampler2D tex;
			uniform vec3 color;
			uniform vec3 lightPos;
			uniform vec3 viewPos;
			uniform float ambient;
			uniform float specularIntensity;
			uniform float shininess;

			varying vec2 v_texCoord;
			varying vec3 v_normal;
			varying vec3 v_fragPos;

			void main() {
				vec4 baseColor;
				if(showTex) {
					baseColor = texture2D(tex, v_texCoord);
				} else {
					baseColor = vec4(color, 1.0);
				}
				
				if(enableLighting) {
					// Normalize vectors
					vec3 normal = normalize(v_normal);
					vec3 lightDir = normalize(lightPos - v_fragPos);
					vec3 viewDir = normalize(viewPos - v_fragPos);
					vec3 reflectDir = reflect(-lightDir, normal);
					
					// Ambient
					vec3 ambientLight = ambient * baseColor.rgb;
					
					// Diffuse
					float diff = max(dot(normal, lightDir), 0.0);
					vec3 diffuseLight = diff * baseColor.rgb;
					
					// Specular
					float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
					vec3 specularLight = specularIntensity * spec * vec3(1.0); // white specular highlight
					
					// Combine all lighting components
					vec3 lighting = ambientLight + diffuseLight + specularLight;
					
					gl_FragColor = vec4(lighting, baseColor.a);
				} else {
					gl_FragColor = baseColor;
				}
			}`;

// Light direction parameters for Task 2
var lightX = 1;
var lightY = 1;

const keys = {};
function updateLightPos() {
	const translationSpeed = 1;
	if (keys['ArrowUp']) lightY -= translationSpeed;
	if (keys['ArrowDown']) lightY += translationSpeed;
	if (keys['ArrowRight']) lightX -= translationSpeed;
	if (keys['ArrowLeft']) lightX += translationSpeed;
}

function SetSpecularLight(param) {
    meshDrawer.setSpecularLight(param.value/100);
    DrawScene();
}
///////////////////////////////////////////////////////////////////////////////////