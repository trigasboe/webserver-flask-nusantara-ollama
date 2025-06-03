# app.py
# File utama untuk aplikasi Flask.
# Berisi logika server, routing, dan interaksi dengan Ollama.

# --- Struktur Folder yang Diharapkan ---
# /nama_folder_aplikasi_Anda  (Folder root aplikasi Anda)
# |
# |-- app.py                   (File ini)
# |
# |-- /static                  (Folder untuk file statis seperti CSS dan JavaScript)
# |   |-- style.css            (File CSS untuk styling halaman)
# |   `-- script.js            (File JavaScript untuk logika front-end)
# |
# `-- /templates               (Folder untuk template HTML)
#     `-- index.html           (File HTML utama untuk antarmuka chat)
# -----------------------------------------

from flask import Flask, render_template, request, Response, jsonify
import requests
import json
import logging # Untuk logging yang lebih baik

# Inisialisasi aplikasi Flask
app = Flask(__name__)

# Setup logging dasar
# Ini akan membantu dalam debugging, menampilkan pesan di konsol server
logging.basicConfig(level=logging.INFO) # Atur level ke INFO atau DEBUG sesuai kebutuhan
logger = logging.getLogger(__name__) # Dapatkan instance logger untuk aplikasi ini

# Konfigurasi Aplikasi
# Semua pengaturan penting ditempatkan di sini agar mudah diubah.
APP_CONFIG = {
    "title": "@trigasboe - Chatbot -- nusantara:0.8b-q8_0 -- Ollama", # Judul aplikasi
    "model_name": "nusantara:0.8b-q8_0", # Nama model Ollama yang akan digunakan
    "ollama_url": "http://localhost:11434/api/generate", # URL endpoint Ollama API
    "theme": { # Pengaturan tema untuk tampilan front-end
        "bg_color": "#282c34",        # Warna latar utama
        "text_color": "#abb2bf",      # Warna teks umum
        "entry_bg": "#1c1f24",        # Warna latar untuk area input dan chat
        "button_bg": "#61afef",       # Warna latar tombol
        "button_fg": "#282c34",       # Warna teks tombol
        "user_prefix_color": "#61afef", # Warna untuk prefix "Anda: "
        "bot_prefix_color": "#98c379",  # Warna untuk prefix "Bot: "
        "error_color": "#e06c75",     # Warna untuk pesan error
        "font_family": "Arial, sans-serif", # Jenis font default
        "font_size_general": "14px",  # Ukuran font umum
        "font_size_prefix": "15px"   # Ukuran font untuk prefix (Anda:, Bot:)
    }
}

def stream_ollama_response(prompt, model_name):
    """
    Mengirim prompt ke Ollama dan menghasilkan (yield) respons token demi token.
    Setiap yield adalah string JSON yang diformat untuk Server-Sent Events (SSE).
    Ini memungkinkan respons ditampilkan secara streaming di front-end.
    """
    headers = {"Content-Type": "application/json"}
    payload = {
        "model": model_name,
        "prompt": prompt,
        "stream": True # Penting untuk respons streaming dari Ollama
    }
    
    logger.info(f"Mengirim permintaan ke Ollama: {APP_CONFIG['ollama_url']} dengan model {model_name} untuk prompt: '{prompt[:50]}...'")
    
    try:
        # Mengirim permintaan POST ke Ollama dengan stream=True
        # Timeout ditambahkan untuk mencegah server hang jika Ollama tidak merespons
        response_stream = requests.post(
            APP_CONFIG["ollama_url"], 
            headers=headers, 
            data=json.dumps(payload), 
            stream=True, 
            timeout=180 # Timeout dalam detik (misalnya, 3 menit)
        )
        response_stream.raise_for_status() # Akan raise HTTPError untuk status 4xx/5xx

        # Iterasi per baris respons dari Ollama (setiap baris adalah JSON chunk)
        for line in response_stream.iter_lines():
            if line: # Pastikan baris tidak kosong
                try:
                    json_chunk = json.loads(line.decode('utf-8')) # Decode byte ke string, lalu parse JSON
                    token = json_chunk.get("response", "") # Ambil token teks
                    is_done = json_chunk.get("done", False) # Cek apakah ini akhir dari respons
                    
                    # Siapkan data untuk dikirim ke client melalui SSE
                    event_data = {"token": token}
                    if is_done:
                        event_data["done"] = True # Tandai jika sudah selesai
                    
                    # logger.debug(f"Streaming token: '{token[:30]}...', done: {is_done}") # Log token (opsional)
                    yield f"data: {json.dumps(event_data)}\n\n" # Format SSE: "data: <json_string>\n\n"

                    if is_done:
                        logger.info("Stream dari Ollama selesai (done=true).")
                        break # Hentikan iterasi jika Ollama menandakan selesai
                except json.JSONDecodeError as e:
                    error_message = f"Error decoding JSON chunk dari Ollama: {line.decode('utf-8', errors='ignore')}. Detail: {str(e)}"
                    logger.error(error_message)
                    yield f"data: {json.dumps({'error': error_message, 'done': True})}\n\n"
                    break 
    except requests.exceptions.Timeout:
        error_message = "Error: Permintaan ke Ollama timeout."
        logger.error(error_message)
        yield f"data: {json.dumps({'error': error_message, 'done': True})}\n\n"
    except requests.exceptions.ConnectionError as e:
        # Error ini terjadi jika server Ollama tidak bisa dijangkau
        error_message = f"Error koneksi ke Ollama di {APP_CONFIG['ollama_url']}. Pastikan Ollama berjalan. Detail: {str(e)}"
        logger.error(error_message)
        yield f"data: {json.dumps({'error': error_message, 'done': True})}\n\n"
    except requests.exceptions.RequestException as e:
        # Error umum lainnya dari library requests
        error_message = f"Error saat request ke Ollama: {str(e)}"
        logger.error(error_message)
        yield f"data: {json.dumps({'error': error_message, 'done': True})}\n\n"
    except Exception as e:
        # Menangkap semua error tak terduga lainnya
        error_message = f"Terjadi kesalahan tak terduga saat streaming: {str(e)}"
        logger.error(error_message, exc_info=True) # exc_info=True akan menyertakan traceback
        yield f"data: {json.dumps({'error': error_message, 'done': True})}\n\n"

@app.route('/') # Rute untuk halaman utama
def index_route(): 
    """Menyajikan halaman utama chat (index.html)."""
    logger.info("Menyajikan halaman utama (index.html).")
    # Mengirim konfigurasi aplikasi ke template agar bisa digunakan di HTML/CSS/JS
    return render_template('index.html', config=APP_CONFIG)

@app.route('/chat', methods=['POST']) # Rute untuk endpoint chat
def chat_endpoint():
    """
    Endpoint untuk menerima pesan pengguna (dalam format JSON) 
    dan mengembalikan respons streaming dari Ollama melalui Server-Sent Events.
    """
    try:
        data = request.get_json() # Ambil data JSON dari body permintaan
        if not data or 'message' not in data:
            logger.warning("Permintaan ke /chat diterima tanpa 'message' dalam JSON.")
            return jsonify({"error": "Format JSON salah atau 'message' tidak ditemukan"}), 400
        
        user_message = data.get('message')
        # Validasi apakah pesan adalah string dan tidak kosong setelah di-trim
        if not isinstance(user_message, str) or not user_message.strip():
            logger.warning(f"Permintaan ke /chat diterima dengan pesan kosong atau tidak valid: '{user_message}'")
            return jsonify({"error": "Pesan tidak boleh kosong"}), 400
            
        logger.info(f"Menerima pesan dari pengguna: '{user_message[:100]}...'")
        # Mengembalikan Response object dengan mimetype text/event-stream untuk SSE
        return Response(stream_ollama_response(user_message, APP_CONFIG["model_name"]), mimetype='text/event-stream')
    except Exception as e:
        logger.error(f"Error di endpoint /chat: {str(e)}", exc_info=True)
        return jsonify({"error": "Terjadi kesalahan internal pada server"}), 500

# Bagian ini menjalankan server pengembangan Flask
# Server akan berjalan di semua antarmuka jaringan (0.0.0.0) pada port 5000.
# debug=True sebaiknya diatur ke False untuk produksi.
if __name__ == '__main__':
    # Untuk produksi, gunakan server WSGI seperti Gunicorn atau Waitress, bukan server pengembangan Flask.
    # Contoh: gunicorn -w 4 -b 0.0.0.0:5000 app:app
    app.run(host='0.0.0.0', port=5000, debug=False) # debug=False untuk produksi