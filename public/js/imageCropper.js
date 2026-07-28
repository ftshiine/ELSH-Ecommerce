// public/js/imageCropper.js
let cropper;
let currentFileInput;
let currentPreviewImg;
let croppedBlobs = {}; // To store the cropped blobs by input ID

function initializeCropper(inputId, previewId) {
    const fileInput = document.getElementById(inputId);
    const modal = document.getElementById('cropperModal');
    const imageToCrop = document.getElementById('imageToCrop');

    fileInput.addEventListener('change', function (e) {
        if (this.files && this.files[0]) {
            currentFileInput = this;
            currentPreviewImg = document.getElementById(previewId);

            const reader = new FileReader();
            reader.onload = function (e) {
                if (cropper) {
                    cropper.destroy();
                    cropper = null;
                }

                modal.style.display = 'flex';

                // Initialize cropper after the image has completely loaded its new source
                imageToCrop.onload = function () {
                    // Small timeout ensures the browser has rendered the modal's DOM layout BEFORE Cropper measures it
                    setTimeout(() => {
                        cropper = new Cropper(imageToCrop, {
                            aspectRatio: 1, // 1:1 Square
                            viewMode: 1,
                            autoCropArea: 0.8, // 80% area keeps the resize handles safely visible on screen
                            background: false
                        });
                        imageToCrop.onload = null; // Prevent re-triggering
                    }, 100);
                };

                imageToCrop.src = e.target.result;
            };
            reader.readAsDataURL(this.files[0]);
        }
    });
}

function closeCropperModal() {
    document.getElementById('cropperModal').style.display = 'none';
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

document.getElementById('cropBtn').addEventListener('click', function () {
    if (cropper) {
        cropper.getCroppedCanvas({
            width: 800,
            height: 800
        }).toBlob((blob) => {
            // Store the blob
            croppedBlobs[currentFileInput.id] = blob;

            // Show preview
            const url = URL.createObjectURL(blob);
            currentPreviewImg.src = url;
            currentPreviewImg.style.display = 'block';

            // Hide the upload placeholder text
            const placeholder = currentFileInput.parentElement.querySelector('.upload-overlay-text');
            if (placeholder) placeholder.style.display = 'none';

            closeCropperModal();
        }, 'image/webp', 0.9);
    }
});

document.getElementById('cancelCropBtn').addEventListener('click', function () {
    currentFileInput.value = ''; // Reset input
    closeCropperModal();
});
