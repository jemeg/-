// بيانات المسؤولين (في الواقع يجب تخزينها في قاعدة بيانات آمنة)
const admins = [
    {
        username: 'Ghazwan-MG',
        password: 'Ghazwan123',
        role: 'superadmin',
        displayName: 'Ghazwan-MG'
    }
];

// التحقق من تسجيل الدخول
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    const admin = admins.find(a => a.username === username && a.password === password);
    
    if (admin) {
        // حفظ بيانات المسؤول في localStorage إذا تم اختيار "تذكرني"
        const adminData = {
            username: admin.username,
            role: admin.role,
            displayName: admin.displayName
        };

        if (rememberMe) {
            localStorage.setItem('adminData', JSON.stringify(adminData));
        } else {
            sessionStorage.setItem('adminData', JSON.stringify(adminData));
        }
        
        // إظهار رسالة نجاح
        showMessage('success', 'تم تسجيل الدخول بنجاح');
        
        // الانتقال إلى الصفحة الرئيسية بعد ثانية
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } else {
        showMessage('error', 'اسم المسؤول أو كلمة المرور غير صحيحة');
    }
});

// إظهار/إخفاء كلمة المرور
document.getElementById('togglePassword').addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    const icon = this.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
});

// دالة إظهار الرسائل
function showMessage(type, message) {
    // إزالة أي رسائل سابقة
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // إخفاء الرسالة تلقائياً بعد 3 ثواني
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// التحقق من تسجيل الدخول عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    const adminData = localStorage.getItem('adminData') || sessionStorage.getItem('adminData');
    
    if (adminData && window.location.pathname.includes('login.html')) {
        window.location.href = 'index.html';
    }
});
