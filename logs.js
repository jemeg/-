// متغيرات عامة
let currentPage = 1;
const itemsPerPage = 20;
let filteredLogs = [];
let charts = {};

// تحميل البيانات عند بدء التطبيق
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // التحقق من تسجيل الدخول
        const adminData = localStorage.getItem('adminData') || sessionStorage.getItem('adminData');
        if (!adminData) {
            window.location.href = 'login.html';
            return;
        }

        // عرض اسم المستخدم
        const userDiv = document.getElementById('adminUsername');
        const userData = JSON.parse(adminData);
        userDiv.textContent = userData.displayName || userData.name;

        // تحميل السجل والإحصائيات
        await loadLogs();
        
        // إضافة مستمعي الأحداث للفلاتر
        addFilterListeners();
    } catch (error) {
        console.error('خطأ في تهيئة الصفحة:', error);
        showMessage('error', 'حدث خطأ أثناء تحميل الصفحة');
    }
});

// تحميل السجل
async function loadLogs() {
    try {
        // الحصول على الفلاتر الحالية
        const filters = {
            action: document.getElementById('actionFilter').value,
            userId: document.getElementById('userFilter').value,
            dateFrom: document.getElementById('dateFrom').value,
            dateTo: document.getElementById('dateTo').value
        };

        // جلب السجلات مع الفلاتر
        const logs = await db.getChangeLog(filters);
        filteredLogs = logs;
        
        // تحديث الإحصائيات
        await updateStatistics();
        
        // تحديث الرسوم البيانية
        updateCharts(logs);
        
        // تحديث قائمة المستخدمين في الفلتر
        updateUserFilter(logs);
        
        // عرض السجلات
        displayLogs();
        
    } catch (error) {
        console.error('خطأ في تحميل السجل:', error);
        showMessage('error', 'حدث خطأ أثناء تحميل السجل');
    }
}

// إضافة مستمعي الأحداث للفلاتر
function addFilterListeners() {
    const filters = ['actionFilter', 'userFilter', 'dateFrom', 'dateTo'];
    filters.forEach(id => {
        document.getElementById(id).addEventListener('change', loadLogs);
    });
}

// تحديث قائمة المستخدمين في الفلتر
function updateUserFilter(logs) {
    const userFilter = document.getElementById('userFilter');
    const currentValue = userFilter.value;
    
    // الحصول على قائمة المستخدمين الفريدة
    const users = [...new Set(logs.map(log => log.userId))];
    
    // تفريغ القائمة
    userFilter.innerHTML = '<option value="">الكل</option>';
    
    // إضافة المستخدمين
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        if (user === currentValue) {
            option.selected = true;
        }
        userFilter.appendChild(option);
    });
}

// عرض السجلات
function displayLogs() {
    const tbody = document.getElementById('logsTableBody');
    const pagination = document.getElementById('pagination');
    
    // حساب الصفحات
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    
    // عرض السجلات
    tbody.innerHTML = filteredLogs.slice(start, end).map(log => `
        <tr>
            <td>${formatDate(log.timestamp)}</td>
            <td>${log.userId}</td>
            <td>${formatAction(log.action)}</td>
            <td>${log.details}</td>
        </tr>
    `).join('');
    
    // تحديث الترقيم
    updatePagination(totalPages);
}

// تحديث ترقيم الصفحات
function updatePagination(totalPages) {
    const pagination = document.getElementById('pagination');
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
function changePage(page) {
    if (page < 1 || page > Math.ceil(filteredLogs.length / itemsPerPage)) return;
    currentPage = page;
    displayLogs();
}

// تنسيق التاريخ
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// تنسيق نوع العملية
function formatAction(action) {
    const actions = {
        'add_row': 'إضافة صف',
        'edit_cell': 'تعديل خلية',
        'delete_row': 'حذف صف',
        'save_schedule': 'حفظ الجدول'
    };
    return actions[action] || action;
}

// عرض رسالة للمستخدم
function showMessage(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.card'));
    
    // إخفاء الرسالة تلقائياً
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// تصدير إلى Excel
function exportToExcel() {
    try {
        const ws = XLSX.utils.json_to_sheet(filteredLogs.map(log => ({
            'التاريخ والوقت': formatDate(log.timestamp),
            'المستخدم': log.userId,
            'نوع العملية': formatAction(log.action),
            'التفاصيل': log.details
        })));
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'سجل التغييرات');
        
        XLSX.writeFile(wb, 'سجل_التغييرات.xlsx');
    } catch (error) {
        console.error('خطأ في تصدير الملف:', error);
        showMessage('error', 'حدث خطأ أثناء تصدير الملف');
    }
}

// تصدير إلى PDF
function exportToPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        
        // إعداد الخط العربي
        doc.addFont('https://fonts.googleapis.com/css2?family=Cairo', 'Cairo', 'normal');
        doc.setFont('Cairo');
        
        // إضافة العنوان
        doc.setFontSize(18);
        doc.text('سجل التغييرات', doc.internal.pageSize.width / 2, 20, { align: 'center' });
        
        // إضافة البيانات
        const data = filteredLogs.map(log => [
            formatDate(log.timestamp),
            log.userId,
            formatAction(log.action),
            log.details
        ]);
        
        doc.autoTable({
            head: [['التاريخ والوقت', 'المستخدم', 'نوع العملية', 'التفاصيل']],
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
        
        doc.save('سجل_التغييرات.pdf');
    } catch (error) {
        console.error('خطأ في تصدير الملف:', error);
        showMessage('error', 'حدث خطأ أثناء تصدير الملف');
    }
}

// تحديث الإحصائيات
async function updateStatistics() {
    try {
        // جلب إحصائيات التواجد لجميع المستخدمين
        const attendanceStats = await db.getAllUsersAttendance();
        
        // تحديث الرسم البياني
        updateAttendanceChart(attendanceStats);
        
        // تحديث قائمة الإحصائيات
        updateAttendanceStats(attendanceStats);
        
    } catch (error) {
        console.error('خطأ في تحديث الإحصائيات:', error);
        showMessage('error', 'حدث خطأ أثناء تحديث الإحصائيات');
    }
}

// تحديث الرسم البياني
function updateAttendanceChart(attendanceStats) {
    const ctx = document.getElementById('attendanceChart').getContext('2d');
    
    // تحويل البيانات إلى تنسيق Chart.js
    const chartData = {
        labels: attendanceStats.map(user => user.name),
        datasets: [{
            label: 'ساعات التواجد',
            data: attendanceStats.map(user => Math.round(user.totalHours * 100) / 100),
            backgroundColor: attendanceStats.map(user => 
                user.isCheckedIn ? 'rgba(75, 192, 75, 0.2)' : 'rgba(75, 192, 192, 0.2)'
            ),
            borderColor: attendanceStats.map(user => 
                user.isCheckedIn ? 'rgba(75, 192, 75, 1)' : 'rgba(75, 192, 192, 1)'
            ),
            borderWidth: 1
        }]
    };
    
    // إنشاء أو تحديث الرسم البياني
    if (charts.attendance) {
        charts.attendance.destroy();
    }
    
    charts.attendance = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'إجمالي ساعات التواجد لكل مستخدم',
                    font: {
                        size: 16,
                        family: 'Cairo'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const user = attendanceStats[context.dataIndex];
                            const hours = Math.round(user.totalHours * 100) / 100;
                            const status = user.isCheckedIn ? 'متواجد حالياً' : 'غير متواجد';
                            return [`${hours} ساعة`, status];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'الساعات',
                        font: {
                            family: 'Cairo'
                        }
                    },
                    ticks: {
                        font: {
                            family: 'Cairo'
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'Cairo'
                        }
                    }
                }
            }
        }
    });
}

// تحديث قائمة الإحصائيات
function updateAttendanceStats(attendanceStats) {
    const statsContainer = document.getElementById('attendanceStats');
    const users = [...attendanceStats].sort((a, b) => b.totalHours - a.totalHours);
    
    const statsHtml = users.map(user => `
        <div class="list-group-item d-flex justify-content-between align-items-center">
            <div>
                <h6 class="mb-0">
                    ${user.name}
                    ${user.isCheckedIn ? 
                        '<span class="badge bg-success ms-2">متواجد</span>' : 
                        '<span class="badge bg-secondary ms-2">غير متواجد</span>'
                    }
                </h6>
                <small class="text-muted">
                    ${user.isCheckedIn ? 
                        'منذ ' + formatTimeDifference(new Date(user.lastCheckIn)) : 
                        'آخر تواجد: ' + (user.lastCheckIn ? formatDate(user.lastCheckIn) : 'لا يوجد')
                    }
                </small>
            </div>
            <span class="badge bg-primary rounded-pill">
                ${Math.round(user.totalHours * 100) / 100} ساعة
            </span>
        </div>
    `).join('');
    
    statsContainer.innerHTML = statsHtml || '<div class="text-center text-muted">لا توجد بيانات</div>';
}

// تنسيق الفرق الزمني
function formatTimeDifference(date) {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 60) {
        return `${diffInMinutes} دقيقة`;
    } else {
        const hours = Math.floor(diffInMinutes / 60);
        const minutes = diffInMinutes % 60;
        return `${hours} ساعة ${minutes} دقيقة`;
    }
}

// تحديث البيانات
function refreshAttendance() {
    updateStatistics();
}
