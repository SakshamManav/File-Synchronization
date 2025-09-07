        let selectedFiles = [];
        let capturedPhotos = [];
        let cameraStream = null;
        
        // API Configuration
    const API_BASE_URL = 'https://e0bd612f814534.lhr.life/api';

        // Check camera availability on page load
        window.addEventListener('DOMContentLoaded', function() {
            checkCameraAvailability();
            checkServerStatus();
        });

        // Check if server is running
        async function checkServerStatus() {
            try {
                const response = await fetch(`${API_BASE_URL}/health`);
                const data = await response.json();
                if (data.status === 'OK') {
                    addSyncActivity('✅ Connected to sync server', 'success');
                }
            } catch (error) {
                addSyncActivity('⚠️ Server connection failed - files will be stored locally', 'error');
                console.warn('Server not available:', error);
            }
        }

        function checkCameraAvailability() {
            if (!navigator.mediaDevices && !navigator.getUserMedia && !navigator.webkitGetUserMedia && !navigator.mozGetUserMedia) {
                const openCameraBtn = document.getElementById('openCameraBtn');
                openCameraBtn.disabled = true;
                openCameraBtn.textContent = 'Camera Not Available';
                openCameraBtn.classList.remove('bg-secondary', 'hover:bg-green-600');
                openCameraBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
                addSyncActivity('Camera not supported on this device', 'error');
            }
        }        // File selection handling
        function handleFileSelect(event) {
            selectedFiles = Array.from(event.target.files);
            displaySelectedFiles();
        }

        function displaySelectedFiles() {
            const selectedFilesDiv = document.getElementById('selectedFiles');
            const fileList = document.getElementById('fileList');
            
            if (selectedFiles.length > 0) {
                selectedFilesDiv.classList.remove('hidden');
                fileList.innerHTML = '';
                
                selectedFiles.forEach((file, index) => {
                    const fileItem = document.createElement('div');
                    fileItem.className = 'flex items-center justify-between bg-gray-100 p-2 rounded';
                    fileItem.innerHTML = `
                        <span class="text-sm text-gray-700">${file.name}</span>
                        <span class="text-xs text-gray-500">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    `;
                    fileList.appendChild(fileItem);
                });
            } else {
                selectedFilesDiv.classList.add('hidden');
            }
        }

        function uploadFiles() {
            if (selectedFiles.length === 0) {
                alert('Please select files first');
                return;
            }
            
            // Simulate upload process
            addSyncActivity(`Uploading ${selectedFiles.length} file(s)...`, 'upload');
            
            setTimeout(() => {
                addSyncActivity(`Successfully uploaded ${selectedFiles.length} file(s)`, 'success');
                selectedFiles = [];
                document.getElementById('fileInput').value = '';
                displaySelectedFiles();
            }, 2000);
        }

        // Camera handling with mobile support
        async function openCamera() {
            try {
                // Check if camera APIs are available
                if (!navigator.mediaDevices) {
                    throw new Error('Camera not supported on this device/browser');
                }

                // Enhanced camera constraints for mobile compatibility
                const constraints = {
                    video: {
                        facingMode: 'environment', // Use back camera on mobile
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                };

                // Try modern API first
                if (navigator.mediaDevices.getUserMedia) {
                    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
                } 
                // Fallback for older browsers
                else if (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia) {
                    const getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
                    cameraStream = await new Promise((resolve, reject) => {
                        getUserMedia.call(navigator, constraints, resolve, reject);
                    });
                } else {
                    throw new Error('Camera API not supported');
                }

                const video = document.getElementById('cameraVideo');
                const placeholder = document.getElementById('cameraPlaceholder');
                
                video.srcObject = cameraStream;
                
                // Wait for video to load before showing
                video.addEventListener('loadedmetadata', () => {
                    video.classList.remove('hidden');
                    placeholder.classList.add('hidden');
                    
                    document.getElementById('openCameraBtn').classList.add('hidden');
                    document.getElementById('captureBtn').classList.remove('hidden');
                    document.getElementById('stopCameraBtn').classList.remove('hidden');
                    
                    addSyncActivity('Camera opened successfully', 'info');
                });

            } catch (error) {
                console.error('Camera error:', error);
                let errorMessage = 'Error accessing camera: ';
                
                if (error.name === 'NotAllowedError') {
                    errorMessage += 'Camera permission denied. Please allow camera access and try again.';
                } else if (error.name === 'NotFoundError') {
                    errorMessage += 'No camera found on this device.';
                } else if (error.name === 'NotSupportedError') {
                    errorMessage += 'Camera not supported on this device/browser.';
                } else if (error.name === 'NotReadableError') {
                    errorMessage += 'Camera is being used by another application.';
                } else {
                    errorMessage += error.message || 'Unknown camera error occurred.';
                }
                
                alert(errorMessage);
                addSyncActivity('Failed to open camera', 'error');
            }
        }

        function capturePhoto() {
            try {
                const video = document.getElementById('cameraVideo');
                const canvas = document.getElementById('cameraCanvas');
                const context = canvas.getContext('2d');
                
                // Ensure video is loaded and playing
                if (video.videoWidth === 0 || video.videoHeight === 0) {
                    alert('Video not ready. Please wait for camera to load completely.');
                    return;
                }
                
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0);
                
                // Convert to JPEG for better mobile compatibility and smaller file size
                const photoData = canvas.toDataURL('image/jpeg', 0.8);
                capturedPhotos.push({
                    data: photoData,
                    timestamp: new Date()
                });
                
                displayCapturedPhotos();
                addSyncActivity('Photo captured successfully', 'success');
                
                // Add visual feedback for capture
                const captureBtn = document.getElementById('captureBtn');
                const originalText = captureBtn.textContent;
                captureBtn.textContent = 'Captured!';
                captureBtn.classList.add('bg-green-500');
                
                setTimeout(() => {
                    captureBtn.textContent = originalText;
                    captureBtn.classList.remove('bg-green-500');
                }, 1000);
                
            } catch (error) {
                console.error('Capture error:', error);
                alert('Failed to capture photo. Please try again.');
                addSyncActivity('Failed to capture photo', 'error');
            }
        }

        function displayCapturedPhotos() {
            const capturedPhotosDiv = document.getElementById('capturedPhotos');
            const photoList = document.getElementById('photoList');
            
            if (capturedPhotos.length > 0) {
                capturedPhotosDiv.classList.remove('hidden');
                photoList.innerHTML = '';
                
                capturedPhotos.forEach((photo, index) => {
                    const photoItem = document.createElement('div');
                    photoItem.className = 'relative';
                    photoItem.innerHTML = `
                        <img src="${photo.data}" alt="Captured photo ${index + 1}" class="w-full h-16 object-cover rounded">
                        <button onclick="removePhoto(${index})" class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                    `;
                    photoList.appendChild(photoItem);
                });
            } else {
                capturedPhotosDiv.classList.add('hidden');
            }
        }

        function removePhoto(index) {
            capturedPhotos.splice(index, 1);
            displayCapturedPhotos();
        }

        // Mobile camera fallback function
        function handleMobileCameraCapture(event) {
            const files = event.target.files;
            if (files.length === 0) return;

            Array.from(files).forEach(file => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        capturedPhotos.push({
                            data: e.target.result,
                            timestamp: new Date()
                        });
                        displayCapturedPhotos();
                        addSyncActivity('Photo captured via mobile camera', 'success');
                    };
                    reader.readAsDataURL(file);
                }
            });

            // Reset the input
            event.target.value = '';
        }

        function stopCamera() {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
                cameraStream = null;
            }
            
            const video = document.getElementById('cameraVideo');
            const placeholder = document.getElementById('cameraPlaceholder');
            
            video.classList.add('hidden');
            placeholder.classList.remove('hidden');
            
            document.getElementById('openCameraBtn').classList.remove('hidden');
            document.getElementById('captureBtn').classList.add('hidden');
            document.getElementById('stopCameraBtn').classList.add('hidden');
            
            addSyncActivity('Camera stopped', 'info');
        }

        function addSyncActivity(message, type) {
            const activityDiv = document.getElementById('syncActivity');
            const activityItem = document.createElement('div');
            
            let iconColor = 'bg-blue-100 text-primary';
            let icon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`;
            
            if (type === 'success') {
                iconColor = 'bg-green-100 text-green-600';
                icon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>`;
            } else if (type === 'upload') {
                iconColor = 'bg-yellow-100 text-yellow-600';
                icon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>`;
            } else if (type === 'error') {
                iconColor = 'bg-red-100 text-red-600';
                icon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`;
            }
            
            activityItem.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg';
            activityItem.innerHTML = `
                <div class="flex items-center">
                    <div class="h-10 w-10 ${iconColor} rounded-full flex items-center justify-center mr-4">
                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            ${icon}
                        </svg>
                    </div>
                    <div>
                        <p class="font-medium text-gray-900">${message}</p>
                        <p class="text-sm text-gray-500">Sync activity</p>
                    </div>
                </div>
                <span class="text-sm text-gray-400">Just now</span>
            `;
            
            activityDiv.insertBefore(activityItem, activityDiv.firstChild);
        }

        // Drag and drop functionality
        const fileInput = document.getElementById('fileInput');
        const dropZone = fileInput.parentElement;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });

        function highlight(e) {
            dropZone.classList.add('border-primary', 'bg-blue-50');
        }

        function unhighlight(e) {
            dropZone.classList.remove('border-primary', 'bg-blue-50');
        }

        dropZone.addEventListener('drop', handleDrop, false);

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            fileInput.files = files;
            handleFileSelect({ target: { files: files } });
        }