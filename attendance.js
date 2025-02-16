// متغيرات عامة
let attendanceChart = null;

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    await loadAttendanceData();
});

// تحميل بيانات التواجد
async function loadAttendanceData() {
    try {
        const logs = await db.getAllLogs();
        const attendanceData = processAttendanceData(logs);
        updateAttendanceChart(attendanceData);
        updateAttendanceStats(attendanceData);
    } catch (error) {
        console.error('خطأ في تحميل بيانات التواجد:', error);
        showMessage('error', 'حدث خطأ أثناء تحميل بيانات التواجد');
    }
}

// معالجة بيانات التواجد
function processAttendanceData(logs) {
    const attendance = {};
    
    logs.forEach(log => {
        if (!attendance[log.userId]) {
            attendance[log.userId] = {
                name: log.userName,
                totalHours: 0,
                sessions: []
            };
        }
        
        if (log.action === 'check_in') {
            attendance[log.userId].sessions.push({
                start: new Date(log.timestamp)
            });
        } else if (log.action === 'check_out' && attendance[log.userId].sessions.length > 0) {
            const lastSession = attendance[log.userId].sessions[attendance[log.userId].sessions.length - 1];
            if (!lastSession.end) {
                lastSession.end = new Date(log.timestamp);
                const hours = (lastSession.end - lastSession.start) / (1000 * 60 * 60);
                attendance[log.userId].totalHours += hours;
            }
        }
    });
    
    return attendance;
}

// تحديث الرسم البياني
function updateAttendanceChart(attendanceData) {
    const ctx = document.getElementById('attendanceChart').getContext('2d');
    
    // تحويل البيانات إلى تنسيق Chart.js
    const chartData = {
        labels: Object.values(attendanceData).map(user => user.name),
        datasets: [{
            label: 'ساعات التواجد',
            data: Object.values(attendanceData).map(user => Math.round(user.totalHours * 100) / 100),
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
        }]
    };
    
    // إنشاء أو تحديث الرسم البياني
    if (attendanceChart) {
        attendanceChart.destroy();
    }
    
    attendanceChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'إجمالي ساعات التواجد لكل مستخدم'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'الساعات'
                    }
                }
            }
        }
    });
}

// تحديث إحصائيات التواجد
function updateAttendanceStats(attendanceData) {
    const statsContainer = document.getElementById('attendanceStats');
    const users = Object.values(attendanceData)
        .sort((a, b) => b.totalHours - a.totalHours);
    
    const statsHtml = users.map(user => `
        <div class="list-group-item d-flex justify-content-between align-items-center">
            <div>
                <h6 class="mb-0">${user.name}</h6>
                <small class="text-muted">${user.sessions.length} جلسة</small>
            </div>
            <span class="badge bg-primary rounded-pill">
                ${Math.round(user.totalHours * 100) / 100} ساعة
            </span>
        </div>
    `).join('');
    
    statsContainer.innerHTML = statsHtml;
}

// تحديث البيانات
function refreshAttendance() {
    loadAttendanceData();
}
