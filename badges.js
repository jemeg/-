// تكوين الشارات حسب الرتب
const RANK_BADGES = {
    'مسعف': {
        class: 'bronze',
        image: 'images/bronze-badge.png'
    },
    'مسعف متقدم': {
        class: 'silver',
        image: 'images/silver-badge.png'
    },
    'فني طوارئ': {
        class: 'gold',
        image: 'images/gold-badge.png'
    },
    'أخصائي طوارئ': {
        class: 'platinum',
        image: 'images/platinum-badge.png'
    },
    'استشاري طوارئ': {
        class: 'diamond',
        image: 'images/diamond-badge.png'
    }
};

// دالة إنشاء شارة الرتبة
function createRankBadge(rank) {
    const badgeConfig = RANK_BADGES[rank] || {
        class: 'bronze',
        image: 'images/default-badge.png'
    };
    
    return `
        <div class="rank-badge ${badgeConfig.class}">
            <img src="${badgeConfig.image}" alt="${rank}" />
            <span>${rank}</span>
        </div>
    `;
}

// تحديث عرض الشارات في الجدول
function updateRankBadges() {
    const rankCells = document.querySelectorAll('.rank-cell');
    rankCells.forEach(cell => {
        const rank = cell.textContent.trim();
        cell.innerHTML = createRankBadge(rank);
    });
}

// تحديث الشارات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', updateRankBadges);

// دالة فتح نافذة تعيين الشارة
function openBadgeModal() {
    const modalHtml = `
        <div class="modal fade" id="badgeModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">تعيين شارة جديدة</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="badge-options">
                            ${Object.entries(RANK_BADGES).map(([rank, badge]) => `
                                <div class="badge-option" data-rank="${rank}">
                                    <div class="rank-badge ${badge.class}">
                                        <img src="${badge.image}" alt="${rank}" />
                                        <span>${rank}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="saveBadgeSelection()">حفظ</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // إضافة النافذة للصفحة
    if (!document.getElementById('badgeModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    // تهيئة النافذة
    const modal = new bootstrap.Modal(document.getElementById('badgeModal'));
    modal.show();
    
    // إضافة مستمع الأحداث للخيارات
    document.querySelectorAll('.badge-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.badge-option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
}

// دالة حفظ اختيار الشارة
async function saveBadgeSelection() {
    const selectedOption = document.querySelector('.badge-option.selected');
    if (!selectedOption) {
        alert('الرجاء اختيار شارة');
        return;
    }
    
    const rank = selectedOption.dataset.rank;
    try {
        // تحديث الرتبة في قاعدة البيانات
        await db.updateEmployeeRank(currentEmployee.id, rank);
        
        // تحديث البيانات المحلية
        currentEmployee.rank = rank;
        sessionStorage.setItem('employeeData', JSON.stringify(currentEmployee));
        
        // إغلاق النافذة
        bootstrap.Modal.getInstance(document.getElementById('badgeModal')).hide();
        
        // تحديث عرض الشارة
        updateEmployeeBadge();
        
        showMessage('success', 'تم تحديث الشارة بنجاح');
    } catch (error) {
        console.error('خطأ في تحديث الشارة:', error);
        showMessage('error', 'حدث خطأ أثناء تحديث الشارة');
    }
}

// تحديث عرض شارة الموظف
function updateEmployeeBadge() {
    const badgeContainer = document.getElementById('employeeBadge');
    if (badgeContainer && currentEmployee.rank) {
        badgeContainer.innerHTML = createRankBadge(currentEmployee.rank);
    }
}
