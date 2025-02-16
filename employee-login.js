// التحقق من دخول الموظف
document.getElementById('employeeLoginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const employeeName = document.getElementById('employeeName').value.trim();
    
    if (employeeName) {
        // حفظ بيانات الموظف
        const employeeData = {
            name: employeeName,
            role: 'employee',
            loginTime: new Date().toLocaleString()
        };

        sessionStorage.setItem('employeeData', JSON.stringify(employeeData));
        
        // إظهار رسالة نجاح
        showMessage('success', 'مرحباً بك ' + employeeData.name);
        
        // الانتقال إلى صفحة المستخدم
        setTimeout(() => {
            window.location.href = 'employee-schedule.html';
        }, 1000);
    } else {
        showMessage('error', 'الرجاء إدخال اسم الموظف');
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
    const employeeData = sessionStorage.getItem('employeeData');
    
    if (employeeData && window.location.pathname.includes('employee-login.html')) {
        window.location.href = 'index.html';
    }
});
