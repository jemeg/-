import db from './database.js';

// متغيرات عامة
let currentPage = 1;
const itemsPerPage = 10;
let filteredShifts = [];
let allShifts = [];
let currentEmployee = null;

// دالة تسجيل الخروج
function handleLogout() {
    sessionStorage.removeItem('employeeData');
    location.replace('employee-login.html');
}

// تعريف دالة تسجيل الخروج في النطاق العام
window.logout = function() {
    handleLogout();
};

// التحقق من تسجيل الدخول عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // التحقق من تسجيل الدخول
        const employeeData = sessionStorage.getItem('employeeData');
        if (!employeeData) {
            window.location.href = 'employee-login.html';
            return;
        }

        // تحميل بيانات الموظف
        currentEmployee = JSON.parse(employeeData);
        
        // عرض اسم المستخدم
        const employeeNameElement = document.getElementById('employeeName');
        if (employeeNameElement && currentEmployee.name) {
            employeeNameElement.textContent = currentEmployee.name;
        }

        // عرض معلومات الموظف
        displayEmployeeInfo(currentEmployee);

        // تحميل البيانات
        await loadScheduleData();
        await loadImages();

        // معالجة تسجيل الخروج
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleLogout();
            });
        }
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        showMessage('error', 'حدث خطأ أثناء تحميل البيانات');
    }
});

// عرض معلومات الموظف
function displayEmployeeInfo(employee) {
    const employeeInfoHtml = `
        <div class="employee-info">
            <div id="employeeBadge">
                ${createRankBadge(employee.rank)}
            </div>
            <button class="change-badge-btn ms-2" onclick="openBadgeModal()">
                <i class="fas fa-edit"></i>
                تغيير الشارة
            </button>
        </div>
        <div class="employee-name">
            ${employee.name}
        </div>
    `;
    
    document.getElementById('employeeInfo').innerHTML = employeeInfoHtml;
}

// تحميل بيانات الجدول
async function loadScheduleData() {
    try {
        const scheduleData = await db.getScheduleData();
        
        // فلترة المناوبات الخاصة بالموظف
        allShifts = scheduleData.filter(row => 
            row.name.trim().toLowerCase() === currentEmployee.name.trim().toLowerCase() &&
            row.rank.trim().toLowerCase() === currentEmployee.rank.trim().toLowerCase()
        );

        // فرز المناوبات حسب التاريخ
        allShifts.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // تطبيق الفلاتر وعرض البيانات
        filteredShifts = allShifts;
        displayShifts();

    } catch (error) {
        console.error('خطأ في تحميل بيانات الجدول:', error);
        showMessage('error', 'حدث خطأ أثناء تحميل بيانات الجدول');
    }
}

// حساب إجمالي ساعات العمل
function calculateTotalHours(shift) {
    if (shift.startTime && shift.endTime) {
        const start = new Date(shift.startTime);
        const end = new Date(shift.endTime);
        const diffHours = (end - start) / (1000 * 60 * 60);
        return Math.round(diffHours * 100) / 100;
    }
    return 0;
}

// عرض المناوبات
function displayShifts() {
    const tbody = document.getElementById('scheduleTableBody');
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = filteredShifts.slice(start, end);
    
    tbody.innerHTML = pageItems.map(shift => {
        const totalHours = calculateTotalHours(shift);
        const rowClass = shift.startTime && !shift.endTime ? 'table-success' : 
                        shift.endTime ? 'table-danger' : '';
        
        return `
        <tr class="${rowClass}">
            <td>${formatDate(shift.date)}</td>
            <td>${getDayName(shift.date)}</td>
            <td class="rank-cell">${shift.rank}</td>
            <td>${shift.shift}</td>
            <td>
                <span class="badge bg-${getStatusBadge(shift.date)}">
                    ${getStatusText(shift.date)}
                </span>
            </td>
            <td class="text-end">${totalHours > 0 ? totalHours + ' ساعة' : '-'}</td>
        </tr>`;
    }).join('');

    updatePagination();
}

// تحديث ترقيم الصفحات
function updatePagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredShifts.length / itemsPerPage);
    
    let html = '';
    
    // زر السابق
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">السابق</a>
        </li>
    `;
    
    // أرقام الصفحات
    for (let i = 1; i <= totalPages; i++) {
        html += `
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
    }
    
    // زر التالي
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">التالي</a>
        </li>
    `;
    
    pagination.innerHTML = html;
}

// تغيير الصفحة
window.changePage = function(page) {
    if (page < 1 || page > Math.ceil(filteredShifts.length / itemsPerPage)) return;
    currentPage = page;
    displayShifts();
};

// تنسيق التاريخ
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

// الحصول على اسم اليوم
function getDayName(dateStr) {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(date);
}

// الحصول على لون حالة المناوبة
function getStatusBadge(dateStr) {
    const shiftDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (shiftDate < today) return 'secondary';
    if (shiftDate.getTime() === today.getTime()) return 'primary';
    return 'success';
}

// الحصول على نص حالة المناوبة
function getStatusText(dateStr) {
    const shiftDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (shiftDate < today) return 'مكتملة';
    if (shiftDate.getTime() === today.getTime()) return 'اليوم';
    return 'قادمة';
}

// تصدير إلى Excel
window.exportToExcel = function() {
    try {
        const ws = XLSX.utils.json_to_sheet(filteredShifts.map(shift => ({
            'التاريخ': formatDate(shift.date),
            'اليوم': getDayName(shift.date),
            'الوردية': shift.shift,
            'الحالة': getStatusText(shift.date)
        })));
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'المناوبات');
        
        XLSX.writeFile(wb, `مناوبات_${currentEmployee.name}.xlsx`);
    } catch (error) {
        console.error('خطأ في تصدير الملف:', error);
        showMessage('error', 'حدث خطأ أثناء تصدير الملف');
    }
};

// تصدير إلى PDF
window.exportToPDF = function() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        
        // إعداد الخط العربي
        doc.addFont('https://fonts.googleapis.com/css2?family=Cairo', 'Cairo', 'normal');
        doc.setFont('Cairo');
        
        // إضافة العنوان
        doc.setFontSize(18);
        doc.text(`مناوبات ${currentEmployee.name}`, doc.internal.pageSize.width / 2, 20, { align: 'center' });
        
        // إضافة البيانات
        const data = filteredShifts.map(shift => [
            formatDate(shift.date),
            getDayName(shift.date),
            shift.shift,
            getStatusText(shift.date)
        ]);
        
        doc.autoTable({
            head: [['التاريخ', 'اليوم', 'الوردية', 'الحالة']],
            body: data,
            startY: 30,
            styles: {
                font: 'Cairo',
                halign: 'right'
            },
            headStyles: {
                fillColor: [24, 117, 238]
            }
        });
        
        doc.save(`مناوبات_${currentEmployee.name}.pdf`);
    } catch (error) {
        console.error('خطأ في تصدير الملف:', error);
        showMessage('error', 'حدث خطأ أثناء تصدير الملف');
    }
};

// تحميل الصور
async function loadImages() {
    try {
        const images = await db.getAllImages();
        const imageGrid = document.querySelector('.image-grid');
        imageGrid.innerHTML = '';
        
        images.forEach(image => {
            const imageCard = document.createElement('div');
            imageCard.className = 'image-card';
            imageCard.innerHTML = `
                <img src="${image.path}" alt="${image.title}">
                <div class="image-overlay">
                    <span class="image-title">${image.title}</span>
                </div>
            `;
            imageGrid.appendChild(imageCard);
        });
    } catch (error) {
        console.error('خطأ في تحميل الصور:', error);
        showMessage('error', 'حدث خطأ أثناء تحميل الصور');
    }
}

// عرض رسائل للمستخدم
function showMessage(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.header-section').nextSibling);
    
    setTimeout(() => alertDiv.remove(), 5000);
}
