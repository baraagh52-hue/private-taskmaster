# Install Python and pip (if not already installed)
sudo apt update
sudo apt install python3 python3-pip

# Install Coqui TTS
pip3 install TTS

# Start the TTS server
tts-server --model_name "tts_models/multilingual/multi-dataset/xtts_v2"
