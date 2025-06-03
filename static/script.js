// static/script.js
// File JavaScript untuk menangani logika interaksi di sisi klien (front-end).
// Termasuk mengirim pesan, menerima respons streaming, dan memperbarui tampilan chat.

document.addEventListener('DOMContentLoaded', () => {
    // Ambil elemen-elemen DOM yang akan dimanipulasi
    const chatArea = document.getElementById('chat-area');
    const userInputEntry = document.getElementById('user-input-entry');
    const sendButton = document.getElementById('send-button');
    const chatAreaContainer = document.getElementById('chat-area-container'); // Untuk scrolling

    // Variabel untuk menyimpan referensi ke elemen pesan bot saat ini (selama streaming)
    let currentBotMessageContentElement = null; // Elemen SPAN untuk teks bot
    let currentBotMessageContainer = null;    // Elemen DIV untuk seluruh blok pesan bot

    // Fungsi untuk otomatis scroll ke bagian bawah area chat
    function scrollToBottom() {
        // Memberi sedikit delay agar DOM sempat update sebelum scroll,
        // terutama penting jika ada elemen baru yang besar atau gambar.
        setTimeout(() => {
            chatAreaContainer.scrollTop = chatAreaContainer.scrollHeight;
        }, 50); // Delay kecil (misal 50ms)
    }

    // Fungsi untuk inisialisasi chat: menampilkan pesan selamat datang dan prompt awal
    function initializeChat() {
        const welcomeMessageDiv = document.createElement('div');
        welcomeMessageDiv.className = 'message'; // Class untuk styling umum pesan
        welcomeMessageDiv.textContent = '(--- Selamat datang di Chatbot Nusantara! Silakan ketik pesan Anda. ---)';
        
        welcomeMessageDiv.style.textAlign = 'right'; // Modifikasi untuk rata kanan
        welcomeMessageDiv.style.fontSize = '1.1em'; // Jika ukuran font normalnya adalah 1em, maka 1.1em akan menjadi 10% lebih besar.
        
        chatArea.appendChild(welcomeMessageDiv);
        
        appendUserPrompt(false); // Tampilkan prompt "Anda: ▸ " tanpa baris kosong sebelumnya
        userInputEntry.focus();  // Otomatis fokus ke bidang input
        scrollToBottom();        // Pastikan pesan selamat datang terlihat
    }

    // Fungsi untuk menambahkan prompt "Anda: ▸ " ke area chat
    function appendUserPrompt(addExtraNewlineBefore) {
        // Tambahkan baris kosong jika diminta (setelah respons bot selesai)
        if (addExtraNewlineBefore) {
            const br = document.createElement('br');
            chatArea.appendChild(br);
        }

        const promptDiv = document.createElement('div');
        promptDiv.className = 'message user-prompt-container'; // Kontainer untuk prompt
        
        const userPrefixSpan = document.createElement('span');
        userPrefixSpan.className = 'user-prefix'; // Class untuk styling "Anda: "
        userPrefixSpan.textContent = 'Anda: ';
        promptDiv.appendChild(userPrefixSpan);

        const promptArrowSpan = document.createElement('span');
        promptArrowSpan.textContent = '▸ '; // Simbol panah prompt
        promptDiv.appendChild(promptArrowSpan);
        
        chatArea.appendChild(promptDiv);
        scrollToBottom(); // Scroll agar prompt terlihat
    }

    // Fungsi untuk menampilkan pesan yang diketik pengguna
    function displayUserMessage(message) {
        // Hapus prompt "Anda: ▸ " yang lama sebelum menambahkan pesan pengguna yang baru
        const oldPrompts = chatArea.querySelectorAll('.user-prompt-container');
        if (oldPrompts.length > 0) {
            oldPrompts[oldPrompts.length - 1].remove(); // Hapus prompt terakhir
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message-container'; // Kontainer untuk pesan pengguna
        
        const userPrefixSpan = document.createElement('span');
        userPrefixSpan.className = 'user-prefix';
        userPrefixSpan.textContent = 'Anda: ';
        messageDiv.appendChild(userPrefixSpan);

        const userTextSpan = document.createElement('span');
        userTextSpan.textContent = message; // Teks pesan pengguna
        messageDiv.appendChild(userTextSpan);
        
        chatArea.appendChild(messageDiv);
        userInputEntry.value = ''; // Kosongkan bidang input setelah pesan dikirim
    }
    
    // Fungsi untuk menampilkan placeholder bot "[Sedang memproses...]" atau pesan error awal
    function displayBotPlaceholderOrInitialError(text, isError = false) {
        currentBotMessageContainer = document.createElement('div');
        currentBotMessageContainer.className = 'message bot-message-container'; // Kontainer untuk pesan bot
        
        const botPrefixSpan = document.createElement('span');
        botPrefixSpan.className = 'bot-prefix'; // Class untuk styling "Bot: "
        botPrefixSpan.textContent = 'Bot: ';
        currentBotMessageContainer.appendChild(botPrefixSpan);

        currentBotMessageContentElement = document.createElement('span'); // Elemen untuk teks bot
        if (isError) {
            currentBotMessageContentElement.className = 'error-message-text'; // Class untuk styling error
        } else {
            currentBotMessageContentElement.className = 'bot-placeholder-text'; // Class untuk styling placeholder
        }
        currentBotMessageContentElement.textContent = text; // Teks placeholder atau error
        currentBotMessageContainer.appendChild(currentBotMessageContentElement);
        
        chatArea.appendChild(currentBotMessageContainer);
        scrollToBottom(); // Scroll agar placeholder/error terlihat
    }

    // Fungsi utama untuk mengirim pesan ke server dan menangani respons
    async function sendMessage() {
        const message = userInputEntry.value.trim(); // Ambil teks dari input, hilangkan spasi di awal/akhir
        if (!message) return; // Jangan kirim jika pesan kosong

        displayUserMessage(message); // Tampilkan pesan pengguna di UI
        
        // Nonaktifkan input dan tombol selama menunggu respons
        userInputEntry.disabled = true;
        sendButton.disabled = true;

        // Tampilkan placeholder "Bot: [Sedang memproses...]"
        displayBotPlaceholderOrInitialError('[Sedang memproses...]', false);

        let firstTokenReceived = false; // Flag untuk menandai apakah token pertama sudah diterima
        let accumulatedResponseText = ""; // Untuk menyimpan seluruh teks respons bot

        try {
            // Kirim permintaan POST ke endpoint /chat di server Flask
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message }), // Kirim pesan dalam format JSON
            });

            // Tangani jika server mengembalikan error HTTP (misalnya, 400, 500) sebelum stream dimulai
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
                // Ganti teks placeholder dengan pesan error dari server
                if (currentBotMessageContentElement) {
                    currentBotMessageContentElement.textContent = errorData.error || `Error: ${response.status}`;
                    currentBotMessageContentElement.className = 'error-message-text';
                }
                finalizeInteraction(true); // Selesaikan interaksi dengan status error
                return;
            }
            
            // Dapatkan reader untuk membaca stream dari body respons
            const reader = response.body.getReader();
            const decoder = new TextDecoder(); // Untuk decode byte stream menjadi teks

            // Loop untuk membaca stream
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const { value, done: readerDone } = await reader.read(); // Baca chunk dari stream
                if (readerDone) { // Jika stream selesai dari sisi reader
                    break; 
                }

                // Decode chunk byte menjadi string
                // Satu chunk bisa mengandung beberapa event SSE jika data datang cepat
                const chunkText = decoder.decode(value, { stream: true });
                const events = chunkText.split('\n\n'); // Pisahkan event SSE (setiap event diakhiri \n\n)
                
                for (const eventString of events) {
                    if (eventString.startsWith('data: ')) { // Pastikan ini adalah data event SSE
                        const jsonDataString = eventString.substring('data: '.length);
                        if (jsonDataString.trim() === "") continue; // Abaikan jika data kosong

                        try {
                            const eventData = JSON.parse(jsonDataString); // Parse JSON dari data event

                            // Tangani jika ada pesan error yang dikirim dalam stream dari backend
                            if (eventData.error) {
                                console.error("Error dari stream backend:", eventData.error);
                                if (!firstTokenReceived) { // Jika error terjadi sebelum token pertama diterima
                                    currentBotMessageContentElement.textContent = eventData.error;
                                    currentBotMessageContentElement.className = 'error-message-text';
                                } else { // Jika error terjadi setelah beberapa token diterima
                                    // Tambahkan pesan error ke teks bot yang sudah ada
                                    const errorSuffixSpan = document.createElement('span');
                                    errorSuffixSpan.className = 'error-message-text';
                                    errorSuffixSpan.textContent = ` [Stream Error: ${eventData.error}]`;
                                    currentBotMessageContentElement.appendChild(errorSuffixSpan);
                                }
                                finalizeInteraction(true); // Selesaikan interaksi dengan status error
                                return; // Hentikan pemrosesan stream lebih lanjut
                            }
                            
                            // Jika ada token teks dari bot
                            if (eventData.token) {
                                if (!firstTokenReceived) {
                                    // Token pertama diterima, hapus placeholder dan class-nya
                                    currentBotMessageContentElement.textContent = ''; 
                                    currentBotMessageContentElement.className = ''; // Hapus class 'bot-placeholder-text'
                                    firstTokenReceived = true;
                                }
                                // Tambahkan token ke teks bot yang ditampilkan
                                currentBotMessageContentElement.textContent += eventData.token;
                                accumulatedResponseText += eventData.token; // Akumulasi untuk logging atau fallback
                                scrollToBottom(); // Scroll agar token baru terlihat
                            }

                            // Jika backend menandakan stream selesai (Ollama 'done' flag)
                            if (eventData.done) {
                                finalizeInteraction(false); // Selesaikan interaksi dengan status sukses
                                return; // Keluar dari loop reader dan pemrosesan event
                            }
                        } catch (e) {
                            console.error("Error parsing JSON dari stream event:", jsonDataString, e);
                            // Jika gagal parse JSON, mungkin ada masalah format dari server
                            if (currentBotMessageContentElement) {
                                currentBotMessageContentElement.textContent = accumulatedResponseText + " [Error: Gagal memproses respons dari server]";
                                currentBotMessageContentElement.className = 'error-message-text';
                            }
                            finalizeInteraction(true); // Selesaikan dengan status error
                            return;
                        }
                    }
                }
            }
            // Jika loop reader selesai tanpa ada eventData.done yang eksplisit (misal, koneksi terputus)
            // Anggap selesai normal jika tidak ada error yang tertangkap sebelumnya
            finalizeInteraction(false); 

        } catch (error) { // Tangani error jaringan atau error lain saat proses fetch
            console.error('Fetch API error:', error);
            if (currentBotMessageContentElement) { // Jika placeholder sudah ada
                currentBotMessageContentElement.textContent = `Kesalahan jaringan atau koneksi: ${error.message}`;
                currentBotMessageContentElement.className = 'error-message-text';
            } else { // Jika error terjadi sebelum placeholder sempat dibuat
                displayBotPlaceholderOrInitialError(`Kesalahan jaringan atau koneksi: ${error.message}`, true);
            }
            finalizeInteraction(true); // Selesaikan dengan status error
        }
    }

    // Fungsi untuk menyelesaikan interaksi (setelah bot selesai merespons atau terjadi error)
    function finalizeInteraction(errorOccurredDuringBotResponse) {
        // Aktifkan kembali input dan tombol
        userInputEntry.disabled = false;
        sendButton.disabled = false;
        
        // Selalu tambahkan baris kosong dan prompt pengguna baru setelah interaksi selesai
        // Sesuai permintaan: "ada satu baris kosong tambahan sebelum prompt 'Anda: ▸ ' berikutnya muncul"
        appendUserPrompt(true); 
        
        userInputEntry.focus(); // Kembalikan fokus ke bidang input
        
        // Reset variabel state untuk pesan bot berikutnya
        currentBotMessageContentElement = null;
        currentBotMessageContainer = null;
        scrollToBottom(); // Pastikan prompt baru terlihat
    }

    // Tambahkan event listener untuk tombol kirim (saat diklik)
    sendButton.addEventListener('click', sendMessage);

    // Tambahkan event listener untuk bidang input (saat tombol Enter ditekan)
    userInputEntry.addEventListener('keypress', (event) => {
        // Kirim pesan jika tombol Enter ditekan dan bukan Shift+Enter (untuk newline)
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Mencegah perilaku default Enter (misalnya, submit form jika ada)
            sendMessage();
        }
    });

    // Panggil fungsi inisialisasi saat halaman selesai dimuat
    initializeChat();
});