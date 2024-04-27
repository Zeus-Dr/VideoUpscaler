document.addEventListener('DOMContentLoaded', function () {
  const popupCard = document.querySelector(".popup-card");
  const closeBtn = document.querySelector(".close-btn");
  const fileUploadInput = document.getElementById('file-upload');
  const uploadedFileDisplay = document.getElementById('file-name');
  const originalVideo = document.getElementById('original-video');
  const upscaledVideo = document.getElementById('upscaled-video');
  const upscaleButton = document.getElementById('upscale-button');
  const downloadButton = document.getElementById('download-button');
  //content slider variables
  const slides = document.querySelectorAll(".slide");
  const sliderContent = document.querySelector(".slider-content");
  const prevSlideBtn = document.querySelector(".prev-slide");
  const nextSlideBtn = document.querySelector(".next-slide");
  let currentIndex = 0;

  window.addEventListener("scroll", function () {
    const windowHeight = window.innerHeight;
    const popupContentHeight = popupCard.scrollHeight;

    // Calculate the maximum height of the popup card based on the window height
    const maxPopupHeight = Math.min(windowHeight * 0.8, popupContentHeight);

    // Update the max-height property of the popup card
    popupCard.style.maxHeight = `${maxPopupHeight}px`;
  });

  window.addEventListener("resize", function () {
    const windowHeight = window.innerHeight;
    const popupContentHeight = popupCard.scrollHeight;

    // Calculate the maximum height of the popup card based on the window height
    const maxPopupHeight = Math.min(windowHeight * 0.8, popupContentHeight);

    // Update the max-height property of the popup card
    popupCard.style.maxHeight = `${maxPopupHeight}px`;
  });

  closeBtn.addEventListener("click", function () {
    popupCard.style.display = "none";
  });

  // Close the popup when clicking outside of it
  document.addEventListener("click", function (event) {
    if (!popupCard.contains(event.target)) {
      popupCard.style.display = "none";
    }
  });

  // Show the pop-up initially
  // popupCard.style.display = "block";

  document.getElementById('file-upload').addEventListener('change', function () {
    var fileInput = document.getElementById('file-upload');
    var fileName = document.getElementById('file-name');
    if (fileInput.files.length > 0) {
      fileName.textContent = fileInput.files[0].name;
    } else {
      fileName.textContent = 'No file';
    }
  });

  var file = null
  var fileURL = null;
  // File upload event listener
  fileUploadInput.addEventListener('change', function (event) {
    event.preventDefault(); // Prevent default form submission behavior
    file = fileUploadInput.files[0];
    const fileType = file.type.split('/')[0]; // Get the file type (e.g., 'video' for video files)
    if (fileType === 'video') {
      fileURL = URL.createObjectURL(file);
      uploadedFileDisplay.innerHTML = `<p>Uploaded File: ${file.name}</p>`;
      originalVideo.querySelector('source').src = fileURL; // Set the src attribute of the source element
      originalVideo.load(); // Load the uploaded video
    } else {
      alert('Please upload a video file.'); // Alert the user if the uploaded file is not a video
      originalVideo.querySelector('source').src = null;
      uploadedFileDisplay.innerHTML = `<p>Uploaded File: No File Uploaded, Please upload compatible formats i.e mp4, mkv..</p>`; // Clear the file input field
    }
  });

  // Upscale button event listener
  upscaleButton.addEventListener('click', function (event) {
    event.preventDefault(); // Prevent default form submission behavior

    if (fileURL) { // Check if fileURL is set
      var formData = new FormData();
      formData.append('file', file);

      const loader = document.getElementById('loader');
      const messageDiv = document.getElementById('message');

      loader.style.display = 'block';

      fetch('http://127.0.0.1:5000/upload-video', {
        method: 'POST',
        body: formData
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Server Error: ' + response.statusText);
          }
          return response.json();
        }).then(data => {
          console.log(data);
          loader.style.display = 'none';
          messageDiv.innerHTML = data.message;
          startLiveUpdate()
        })
        .catch(error => {
          console.error(error);
          loader.style.display = 'none';
          messageDiv.innerHTML = error.message;
        });
    } else {
      alert('Please upload a video file before upscaling.'); // Alert the user if no video file is uploaded
    }
  });

  // Function to update the progress bar
  function updateProgress(progress) {
    const progressBar = document.getElementById("progress-bar");
    progressBar.style.width = progress + "%";
    progressBar.innerText = progress + "%";
  }

  function startLiveUpdate() {
    // Store the interval ID returned by setInterval
    const intervalId = setInterval(function () {
        fetch('http://127.0.0.1:5000/progress')
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(function (data) {
                updateProgress(data.progress);
                
                // Check if progress is 100 or 100.0, and clear the interval if true
                if (data.progress === 100 || data.progress === 100.0) {
                    clearInterval(intervalId);
                    document.getElementById('message').innerHTML = 'Upscaling Complete!!!';
                    loadUpscaledVideo()
                    const progressBar = document.getElementById("progress-bar");
                    progressBar.style.width = 0 + "%";
                    progressBar.innerText = 0 + "%";
                }
            })
            .catch(function (error) {
                console.error('Error fetching progress:', error);
            });
    }, 1000);
  }

  function formatUpscaledFileName(originalFileName) {
    // Split the original file name into name and extension
    const parts = originalFileName.split('.');
    // Insert "_upscaled" before the extension
    const upscaledFileName = parts.slice(0, -1).join('.') + '_upscaled.mp4';
    return upscaledFileName;
  }

  function loadUpscaledVideo() {
    const upscaledVideo = document.getElementById('upscaled-video');

    const upscaledVideoName = formatUpscaledFileName(file.name);

    console.log("The upscaled video name is ", upscaledVideoName);
    // Make a request to retrieve the upscaled video from the backend
    fetch(`http://127.0.0.1:5000/upscaled-video/${upscaledVideoName}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to retrieve upscaled video');
            }
            return response.blob(); // Convert response to a Blob object
        })
        .then(blob => {
            // Create a URL for the Blob object
            const videoURL = URL.createObjectURL(blob);
            // Set the src attribute of the <video> tag to the videoURL
            upscaledVideo.src = videoURL;
            upscaledVideo.load(); // Load the Uoscaled video
        })
        .catch(error => {
            console.error('Error loading upscaled video:', error);
            // Handle error, such as displaying a message to the user
        });
    }


  // Download button event listener
  downloadButton.addEventListener('click', function () {
    const a = document.createElement('a');
    a.href = upscaledVideo.src;
    a.download = 'upscaled_video.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  //for the content slider
  function slideNext() {
    currentIndex = (currentIndex + 1) % slides.length;
    updateSlider();
  }

  function slidePrev() {
    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
    updateSlider();
  }

  function updateSlider() {
    const offset = -currentIndex * 100;
    sliderContent.style.transform = `translateX(${offset}%)`;
    if (currentIndex === 0) {
      sliderContent.style.overflowX = "hidden";
    } else {
      sliderContent.style.overflowX = "visible";
    }
  }

  setInterval(slideNext, 10000); // Change slide every 10 seconds

  prevSlideBtn.addEventListener("click", slidePrev);
  nextSlideBtn.addEventListener("click", slideNext);
});
