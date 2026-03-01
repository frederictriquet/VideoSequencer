

cd /Users/fred/Code/VideoSequencer/render-service
source venv/bin/activate
CLIPS_DIR=/Users/fred/Code/VideoSequencer/clips OUTPUT_DIR=/Users/fred/Code/VideoSequencer/output python -m uvicorn main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 1800
