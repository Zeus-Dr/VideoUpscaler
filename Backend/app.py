from io import StringIO
import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from flask import send_from_directory
from werkzeug.utils import secure_filename
from DJGAN.inference_model_video import main as run_gan_inference
import argparse
import threading
import time
import re

app = Flask(__name__)
CORS(app, origins='*')  # Enable CORS for all routes

progress = None
progress_lock = threading.Lock()  # Lock for thread-safe access to progress variable

# Define the folder where uploaded videos will be saved
UPLOAD_FOLDER = '.\\DJGAN\\inputs'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Define the allowed extensions for uploaded videos
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mkv', 'mov'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def capture_output():
    global progress
    while True:
        time.sleep(1)  # Adjust sleep time as needed
        with progress_lock:
            progress = sys.stdout.getvalue()

@app.route('/upload-video', methods=['POST'])
def upload_video():
    if 'file' not in request.files:
        return 'No file part'

    file = request.files['file']

    if file.filename == '':
        return 'No selected file'

    if file and allowed_file(file.filename):
        if not os.path.exists(app.config['UPLOAD_FOLDER']):
            os.makedirs(app.config['UPLOAD_FOLDER'])

        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        # Run inference asynchronously
        args = argparse.Namespace(
            input=file_path,
            model_name='RealESRGAN_x4plus',
            output='.\\DJGAN\\results',
            denoise_strength=0.5,
            outscale=4,
            suffix='upscaled',
            tile=0,
            tile_pad=10,
            pre_pad=0,
            face_enhance=False,
            fp32=False,
            fps=None,
            ffmpeg_bin='ffmpeg',
            extract_frame_first=False,
            num_process_per_gpu=1,
            alpha_upsampler='realesrgan',
            ext='auto'
        )
        
        # Start a separate thread to run inference
        inference_thread = threading.Thread(target=run_gan_inference, args=(args,))
        inference_thread.start()

        return jsonify({'message' : 'Upscaling in Progress!!!'})

    else:
        return jsonify({'message' : 'Invalid file extension'}) 

# Route to get progress updates
@app.route('/progress', methods=['GET'])
def get_progress():
    with progress_lock:
        if progress:
            # Extract last progress value corresponding to "Progress (Worker 0)"
            progress_matches = re.findall(r'Progress \(Worker 0\): (\d+\.\d+)%', progress)
            if progress_matches:
                last_progress_value = float(progress_matches[-1])
                return jsonify({'progress': last_progress_value})

        return jsonify({'progress': None})

# Route to get upscaled video
@app.route('/upscaled-video/<filename>', methods=['GET'])
@cross_origin()
def get_upscaled_video(filename):
    # Define the directory where upscaled videos are stored
    upscaled_video_dir = '.\\DJGAN\\results'

    # Serve the requested video file from the specified directory
    return send_from_directory(upscaled_video_dir, filename)


if __name__ == '__main__':
    sys.stdout = StringIO()  # Redirect stdout to capture output
    progress_thread = threading.Thread(target=capture_output)
    progress_thread.start()
    app.run(debug=True)
