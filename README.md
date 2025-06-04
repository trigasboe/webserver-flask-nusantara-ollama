# Webserver-flask-nusantara-ollama
Aplikasi web interaktif berbasis Python dan Flask menggunakan model AI nusantara dengan server lokal di Ollama. Respons teks dihasilkan secara real-time stream-on ke antarmuka pengguna web melalui Server-Sent Events (SSE), url: http://localhost:11434.

# Langkah-Langkah:
  1. Download dan install ollama. https://ollama.com/
  
  2. Create model LLM Nusantara dalam file Nusantara-0.8b-Indo-Chat-q8_0.gguf (kuantisasi 8 bit) atau Nusantara-0.8b-Indo-Chat-f16.gguf (kuantisasasi 16 bit)
     Referensi: https://github.com/trigasboe/ai-nusantara-in-ollama
  
  3. Jalankan model nusantara: 
       - Running ollama yang sudah terinstal di windows.
         ![image](https://github.com/user-attachments/assets/8c7a096f-5dde-41c1-a789-074feb44a65d)

       - (Bisa melalui CMD windows) Ketik perintah:
           - Bash: ollama --version                   ➡ untuk melihat versi ollama
           - Bash: ollama list                        ➡ untuk melihat daftar model yang terintegrasi di ollama
           - Bash: ollama run nusantara:0.8b-q8_0     ➡ Menjalankan model nusantara:0.8b-q8_0
           - Tuliskan sembarang kalimat perintah (prompt) untuk menguji model.
             ![image](https://github.com/user-attachments/assets/f273f244-9ec5-4b22-a2d3-d8ee71c8d039)
 
  4. Download semua file dan folder, secara manual atau dengan menggunakan perintah git clone :
           - Unduh (Download) dan instal Git:  https://git-scm.com/downloads
           - Ketikkan perintah (prompt): "git clone https://github.com/trigasboe/webserver-flask-nusantara-ollama.git" di CMD.
             ![image](https://github.com/user-attachments/assets/4d18d8c0-406e-41cb-b1fa-15380a32b712)
             ![image](https://github.com/user-attachments/assets/66eaf3a3-f817-4109-994a-df52f860cf85)

  6. Jalankan kode python main.py
     
# Hasil
![image](https://github.com/user-attachments/assets/2610d81c-9d8c-4e42-9473-6d420d6b7649)

