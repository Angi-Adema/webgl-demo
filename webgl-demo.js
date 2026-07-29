        // Get the canvas element from the HTML document by its ID
        const canvas = document.getElementById("glCanvas");

        // Initialize the WebGL rendering context from the canvas element
        const gl = canvas.getContext("webgl");

        // Check if the WebGL context was successfully initialized, alert user if it was not
        if (!gl) {
            alert("WebGL not supported in this browser.");
        }

        // Create a constant variable to store the GLSL shader code written as a JavaScript
        // template literal.
        const vertexShaderSource = `
            attribute vec2 aPosition;     // Attribute containing the two-dimensional (x, y) position of each vertex
            attribute vec3 aColor;        // Attribute containing the red, green, and blue (RGB) color values for each vertex

            varying vec3 vColor;          // Varying variable used to pass the interpolated color from the vertex shader to the fragment shader

            void main() {                                    // Entry-point of the vertex shader that executes once for each vertex
                gl_Position = vec4(aPosition, 0.0, 1.0);     // Assign the vertex position using x, y, z, and w coordinates (a_position contains x and y)
                vColor = aColor;                             // Pass the vertex color to the fragment shader through the varying variable
            }
        `;

        // Create the constant variable to store the GLSL fragment shader source code written as a JavaScript 
        // template literal. 
        const fragmentShaderSource = `
            precision mediump float;       // Set the default precision for floating-point values used in the fragment shader

            varying vec3 vColor;           // Receive the interpolated RGB color passed from the vertex shader

            void main() {                             // Entry-point of the fragment shader that executes once for each fragment (potential pixel)
                gl_FragColor = vec4(vColor, 1.0);     // Set the final RGBA color of the fragment using the interpolated RGB color and a fully opaque alpha value
            }
        `;

        // Create a function that creates and compiles either a vertex or fragment shader
        // from the supplied GLSL source code and returns the compiled shader object
        function createShader(type, source) {
            // Create a new shader object of the specified type (vertex or fragment)
            const shader = gl.createShader(type);

            // Attach the GLSL source code to the shader object
            gl.shaderSource(shader, source);
            // Compile the shader source code into executable GPU instructions
            gl.compileShader(shader);

            // Check if the shader compilation was successful
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                // Display the compiler error message in the browser's developer console
                console.error("Shader compilation failed: ", gl.getShaderInfoLog(shader));
                // Delete the shader object to free up GPU resources
                gl.deleteShader(shader);
                // Return null to indicate that shader creation failed
                return null;
            }
            // Return the compiled shader object if compilation was successful
            return shader;
        }

        // Compile both the vertex and fragment shaders to create a WebGL shader object
        // Call shader methods above attaching the GLSL source code to be used by the GPU to execute the image 
        const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);   // Specifies position of the shader on the canvas

        const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);   // Specifies color of the shader on the canvas 

        // Create an empty WebGL program object to link the vertex and fragment shaders
        // WebGL cannot execute shaders directly; they must be linked into a program container to execute
        const shaderProgram = gl.createProgram();

        gl.attachShader(shaderProgram, vertexShader);  // Attach compiled vertex shader to the program
        gl.attachShader(shaderProgram, fragmentShader);  // Attach compiled fragment shader to the program
        gl.linkProgram(shaderProgram);      // Link the attached vertex and fragment shaders into the program so GPU can execute them

        // Check for program-linking errors and if there is an error, end the program and display message
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error("Program linking failed: ", gl.getProgramInfoLog(shaderProgram));
            return;
        }

        // Use the linked shader program for subsequent WebGL rendering operations
        gl.useProgram(shaderProgram);

        // Create arrays to store recursively generated vertex position and color attributes
        const positions = [];
        const colors = [];

        // Calculate the midpoint between two vertices to subdivide a triangle into smaller triangles
        function findMidpoint(vertex1, vertex2) {
            return [
                (vertex1[0] + vertex2[0]) / 2,   // Midpoint of the x-coordinate
                (vertex1[1] + vertex2[1]) / 2    // Midpoint of the y-coordinate
            ];
        }

        // Add one triangle's vertex positions and colors to the arrays
        function addTriangle(vertex1, vertex2, vertex3) {
            positions.push(
                // Store the x- and y-coordinates of each vertex
                vertex1[0], vertex1[1],   // Vertex 1 position
                vertex2[0], vertex2[1],   // Vertex 2 position
                vertex3[0], vertex3[1]    // Vertex 3 position
            );

            // Assign red, green, and blue colors to the three vertices
            colors.push(
                1.0, 0.0, 0.0,   // Vertex 1 color red
                0.0, 1.0, 0.0,   // Vertex 2 color green
                0.0, 0.0, 1.0    // Vertex 3 color blue
            );
        }

        // Recursively divide a triangle into three smaller triangles
        function divideTriangle(vertex1, vertex2, vertex3, level) {
            // Base case when the final level is reached, store the triangle
            if (level === 0) {
                addTriangle(vertex1, vertex2, vertex3);    // When level reaches 0, store the triangle vertex data in the arrays
                return;                                    // End the function call for the base case
            }

            // To create smaller triangles, calculate the midpoint of each side
            const midpoint12 = findMidpoint(vertex1, vertex2);  // Name indicates the midpoint between vertex1 and vertex2
            const midpoint23 = findMidpoint(vertex2, vertex3);  // Name indicates the midpoint between vertex2 and vertex3
            const midpoint31 = findMidpoint(vertex3, vertex1);  // Name indicates the midpoint between vertex3 and vertex1

            // Create the three smaller triangles, recursively subdividing until the level reaches 0
            // The center triangle is intentionally omitted
            divideTriangle(     // Bottom-left triangle
                vertex1,
                midpoint12,
                midpoint31,
                level - 1       // Each recursive call decreases by one level
            );

            divideTriangle(   // Bottom-right triangle
                midpoint12,
                vertex2,
                midpoint23,
                level - 1
            );

            divideTriangle(   // Top triangle
                midpoint31,
                midpoint23,
                vertex3,
                level - 1
            );
        }

        // Define the three vertices of the original large triangle within WebGL's coordinate range of -1.0 to 1.0 for both x and y axes
        const bottomLeft = [-0.9, -0.8];
        const bottomRight = [0.9, -0.8];
        const topVertex = [0.0, 0.9];

        // Generate the Sierpinski Gasket
        // Define the number of triangles generated - a larger number creates a more detailed gasket (sets the level value for recursive subdivision)
        const subdivisionLevel = 5;

        // First execution of the divideTriangle function to start generating the Sierpinski Gasket
        divideTriangle(
            bottomLeft,        // [-0.9, -0.8]
            bottomRight,       // [0.9, -0.8]
            topVertex,         // [0.0, 0.9]
            subdivisionLevel   // 5
        );

        // Create an empty GPU buffer for storing the vertex positions
        const positionBuffer = gl.createBuffer();

        // Bind the position buffer as the active buffer for vertex attribute data
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        // Copy the vertex positions into the active GPU buffer as 32-bit floating-point numbers
        gl.bufferData(
            gl.ARRAY_BUFFER,               // Store data in the active vertex attribute buffer
            new Float32Array(positions),   // Convert the positions array to a typed array for GPU use (WebGL will not take a JavaScript array)
            gl.STATIC_DRAW                 // Specify that the data will be copied once and resused for rendering
        );

        // Retrieve the location of the aPosition attribute in the linked shader program
        const positionLocation = gl.getAttribLocation(shaderProgram, "aPosition");

        // Instruct WebGL how to read the vertex data stored in the active buffer (2 floating-point values)
        gl.vertexAttribPointer(
            positionLocation,     // Apply this instruction to the aPosition attribute
            2,                    // Each vertex consists of 2 components (x and y)
            gl.FLOAT,             // All values are floating-point numbers
            false,                // Telling WebGL to use the values exactly as stored (do not normalize)
            0,                    // Vertex data is tightly packed, so no extra bytes are skipped between vertices
            0                     // Offset instructing WebGL where to start reading the vertex data in the buffer (first value is x so offset is 0)
        );

        // Enable the position attribute to use the vertex data during rendering
        gl.enableVertexAttribArray(positionLocation);

        // Create an empty GPU buffer for storing the vertex colors
        const colorBuffer = gl.createBuffer();

        // Bind the color buffer as the active buffer for color attribute data
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);

        // Copy the vertex colors into the active GPU buffer as 32-bit floating-point numbers
        gl.bufferData(
            gl.ARRAY_BUFFER,            // Store the color data in the active buffer
            new Float32Array(colors),   // Convert the datatype from a JavaScript array to a typed array for GPU use
            gl.STATIC_DRAW              // Specify that the color data will be copied once and reused for rendering
        );

        // Retrieve the location of the aColor attribute in the linked shader program
        const colorLocation = gl.getAttribLocation(shaderProgram, "aColor");

        // Instruct WebGL how to interpret the color data stored in the active buffer (3 floating-point values)
        gl.vertexAttribPointer(
            colorLocation,     // Apply this instruction to the aColor attribute
            3,                 // Each color consists of 3 components (red, green, blue)
            gl.FLOAT,          // All values are floating-point numbers
            false,             // Telling WebGL to use the values exactly as stored (do not normalize) 
            0,                 // Color data is tightly pack so there are no bytes skipped between vertices
            0                  // Offset instructing WebGL where to start reading the color data in the buffer (first value is red so offset is 0)
        );

        // Enable the color attribute to use the color data during rendering
        gl.enableVertexAttribArray(colorLocation);

        // Set the portion of the canvas that WebGL will use for rendering
        gl.viewport(0, 0, canvas.width, canvas.height);

        // Set the canvas background color to white using RGBA values
        gl.clearColor(1.0, 1.0, 1.0, 1.0);

        // Clear the canvas using the specified background color
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Render every group of three vertices as an individual triangle
        gl.drawArrays(gl.TRIANGLES, 0, positions.length / 2);
        

        