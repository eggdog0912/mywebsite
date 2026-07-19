import { supabase } from "./supabase.js";

const usernameInput = document.getElementById('username'); // Bu alanı artık E-posta olarak kullanacağız
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');
const registerLink = document.getElementById('register-link');

// 🔐 GİRİŞ YAPMA FONKSİYONU
loginButton.addEventListener('click', async () => {
    const email = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!email.includes("@")) {
        alert("Lütfen geçerli bir e-posta adresi girin (Örn: bura@agatube.com)");
        return;
    }

    if (password.length < 6) {
        alert("Şifre en az 6 karakter olmalıdır.");
        return;
    }

    // Supabase ile Giriş Yap
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

   
    if (error) {
        alert("Giriş başarısız: " + error.message);
        return;
    }

    // Supabase oturumu başarıyla başlattıysa yönlendiriyoruz
    alert("Giriş başarılı! Yönlendiriliyorsunuz...");
    window.location.href = 'index.html';

    // Kullanıcının kanal adını profiles tablosundan çekelim
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('channel_name')
        .eq('id', data.user.id)
        .single();

    if (profileData) {
        localStorage.setItem("username", profileData.channel_name);
    } else {
        localStorage.setItem("username", email.split('@')[0]); // Profil yoksa e-postanın ilk kısmını al
    }

    // Ana sayfaya yönlendir
    window.location.href = 'index.html';
});

// 📝 KAYIT OLMA FONKSİYONU (Kayıt linkine tıklandığında)
registerLink.addEventListener('click', async (e) => {
    e.preventDefault(); // Sayfa yönlenmesini durdur
    console.log("Kayıt butonuna tıklandı!"); // Tarayıcı konsolunda tetiklendiğini görmek için

    const email = usernameInput.value.trim();
    const password = passwordInput.value;

    // Alanların doldurulup doldurulmadığını kontrol edelim
    if (!email || !password) {
        alert("Lütfen önce yukarıdaki Username alanına geçerli bir e-posta, Password alanına da şifre yazın.");
        return;
    }

    if (!email.includes("@")) {
        alert("Username alanına yazdığınız metin geçerli bir e-posta olmalıdır (Örn: bura@agatube.com)");
        return;
    }

    if (password.length < 6) {
        alert("Şifre en az 6 karakter olmalıdır.");
        return;
    }

    const channelName = prompt("Kanalınızın adı ne olsun? (Örn: burakar98)");
    if (!channelName || channelName.trim() === "") {
        alert("Kanal adı boş bırakılamaz.");
        return;
    }

    console.log("Supabase'e kayıt isteği gönderiliyor...");

    // Supabase ile Kullanıcı Oluştur
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        console.error("Kayıt Hatası:", error);
        alert("Kayıt hatası: " + error.message);
        return;
    }

    
    if (data.user) {
        console.log("Kullanıcı oluşturuldu, profil tablosuna yazılıyor...", data.user.id);
        
        // Kullanıcı başarıyla oluştuysa profiles tablosuna kanal adını ekle
        const { error: profileError } = await supabase
            .from('profiles')
            .insert([
                { 
                    id: data.user.id, 
                    channel_name: channelName.trim() 
                }
            ]);

        if (profileError) {
            console.error("Profil Hatası:", profileError);
            alert("Kanal adı oluşturulamadı ama üyelik açıldı: " + profileError.message);
        } else {
            alert("🎉 Hesabınız ve Kanalınız başarıyla oluşturuldu! Şimdi Login butonuna basarak giriş yapabilirsiniz.");
        }
    }
});