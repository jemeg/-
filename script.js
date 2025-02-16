// البيانات الأولية
const initialData = [];

// تحميل البيانات عند بدء التطبيق
document.addEventListener('DOMContentLoaded', async function() {
    // التحقق من تسجيل الدخول
    const adminData = localStorage.getItem('adminData') || sessionStorage.getItem('adminData');
    const employeeData = sessionStorage.getItem('employeeData');

    if (!adminData && !employeeData) {
        window.location.href = 'login.html';
        return;
    }

    // عرض اسم المستخدم وإدارة الصلاحيات
    const userDiv = document.getElementById('adminUsername');
    const currentUser = adminData ? JSON.parse(adminData) : JSON.parse(employeeData);
    userDiv.textContent = currentUser.displayName || currentUser.name;

    if (adminData) {
        enableAdminControls();
    } else {
        disableEmployeeControls();
    }

    await loadInitialData();
    addTableSearch();
});

// تفعيل صلاحيات المسؤول
function enableAdminControls() {
    // إظهار جميع الأزرار وتفعيلها
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'inline-block';
        el.disabled = false;
    });
    
    // تفعيل أزرار التعديل والحذف في الجدول
    const table = document.querySelector('table');
    if (table) {
        table.classList.add('admin-table');
    }
}

// تعطيل صلاحيات الموظف
function disableEmployeeControls() {
    // إخفاء زر الإضافة
    document.getElementById('addButton').style.display = 'none';
    
    // إخفاء أزرار التعديل والحذف من الجدول
    document.querySelectorAll('.edit-btn, .delete-btn').forEach(btn => {
        btn.style.display = 'none';
    });
    
    // تعطيل التعديل المباشر على الخلايا
    document.querySelectorAll('td[contenteditable="true"]').forEach(cell => {
        cell.contentEditable = false;
    });
    
    // إخفاء أي عناصر إضافية خاصة بالمسؤول
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'none';
    });
    
    // إضافة رسالة للموظفين
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'employee-message';
        messageDiv.innerHTML = '<i class="fas fa-info-circle"></i> يمكنك فقط عرض الجدول. للتعديل، يرجى التواصل مع المسؤول.';
        tableContainer.insertBefore(messageDiv, tableContainer.firstChild);
    }
}

// إضافة صف للجدول
async function addTableRow(data = null) {
    const table = document.querySelector('table tbody');
    const row = table.insertRow();
    
    // إضافة الخلايا
    const cells = ['name', 'position', 'startTime', 'endTime', 'notes'];
    cells.forEach((cell, index) => {
        const td = row.insertCell();
        td.contentEditable = true;
        td.className = cell;
        if (data) {
            td.textContent = data[cell] || '';
        }
    });

    // إضافة خلية الأزرار
    const actionsCell = row.insertCell();
    actionsCell.className = 'actions';
    actionsCell.innerHTML = `
        <button class="btn btn-danger delete-btn" onclick="deleteRow(this)">
            <i class="fas fa-trash-alt"></i>
        </button>
    `;

    // تسجيل التغيير
    if (data) {
        const user = getCurrentUser();
        await db.logChange(user.id || user.name, 'add_row', {
            rowData: data
        });
    }

    // حفظ البيانات
    await saveTableData();
}

// حذف صف من الجدول
async function deleteRow(btn) {
    const row = btn.closest('tr');
    const rowData = getRowData(row);
    
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
        row.remove();
        
        // تسجيل التغيير
        const user = getCurrentUser();
        await db.logChange(user.id || user.name, 'delete_row', {
            rowData: rowData
        });

        // حفظ البيانات
        await saveTableData();
    }
}

// حفظ بيانات الجدول
async function saveTableData() {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    const data = rows.map(row => getRowData(row));
    
    try {
        await db.saveScheduleData(data);
        showMessage('success', 'تم حفظ البيانات بنجاح');
    } catch (error) {
        showMessage('error', 'حدث خطأ أثناء حفظ البيانات');
        console.error('Error saving data:', error);
    }
}

// تحميل البيانات الأولية
async function loadInitialData() {
    try {
        const data = await db.getScheduleData();
        if (data && data.length > 0) {
            data.forEach(row => addTableRow(row));
        } else {
            // إضافة صف فارغ إذا لم تكن هناك بيانات
            addTableRow();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        showMessage('error', 'حدث خطأ أثناء تحميل البيانات');
    }
}

// الحصول على بيانات صف
function getRowData(row) {
    return {
        name: row.cells[0].textContent,
        position: row.cells[1].textContent,
        startTime: row.cells[2].textContent,
        endTime: row.cells[3].textContent,
        notes: row.cells[4].textContent
    };
}

// الحصول على بيانات المستخدم الحالي
function getCurrentUser() {
    const adminData = localStorage.getItem('adminData') || sessionStorage.getItem('adminData');
    const employeeData = sessionStorage.getItem('employeeData');
    return adminData ? JSON.parse(adminData) : JSON.parse(employeeData);
}

// مراقبة التغييرات في الخلايا
document.querySelector('table').addEventListener('input', async function(e) {
    if (e.target.tagName === 'TD') {
        const row = e.target.closest('tr');
        const columnName = e.target.className;
        const newValue = e.target.textContent;
        
        // تسجيل التغيير
        const user = getCurrentUser();
        await db.logChange(user.id || user.name, 'edit_cell', {
            column: columnName,
            newValue: newValue,
            rowData: getRowData(row)
        });

        // حفظ البيانات
        await saveTableData();
    }
});

// دالة حذف صف
function deleteRow(button) {
    const row = button.closest('tr');
    
    // إضافة تأثير تلاشي قبل الحذف
    row.style.transition = 'all 0.3s ease';
    row.style.transform = 'scale(0.95)';
    row.style.opacity = '0';
    
    setTimeout(() => {
        row.remove();
        saveToLocalStorage(); // حفظ التغييرات بعد الحذف
    }, 300);
}

// دالة إضافة صف جديد
function addNewRow() {
    const tableBody = document.getElementById('tableBody');
    const newRow = document.createElement('tr');
    
    newRow.innerHTML = `
        <td><input type="text" class="form-control form-control-sm" placeholder="اسم الموظف"></td>
        <td><input type="text" class="form-control form-control-sm" placeholder="المسمى الوظيفي"></td>
        <td><input type="text" class="form-control form-control-sm" placeholder="الرتبة"></td>
        <td>
            <button class="btn btn-outline-success btn-sm time-btn" onclick="recordTime(this, 'start')">
                <i class="fas fa-clock"></i>
                التسجيل في الخدمة
            </button>
        </td>
        <td>
            <button class="btn btn-outline-danger btn-sm time-btn" onclick="recordTime(this, 'end')" disabled>
                <i class="fas fa-clock"></i>
                الخروج من الخدمة
            </button>
        </td>
        <td><input type="text" class="form-control form-control-sm" placeholder="ملاحظات"></td>
        <td>
            <button class="btn btn-danger btn-sm" onclick="deleteRow(this)">
                <i class="fas fa-trash-alt"></i> حذف
            </button>
        </td>
    `;
    
    tableBody.appendChild(newRow);
}

// دالة تسجيل الوقت
function recordTime(button, type) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false,
        numberingSystem: 'latn'  // استخدام الأرقام اللاتينية
    });
    
    // تحديث شكل ومحتوى الزر
    button.innerHTML = `<i class="fas fa-check-circle"></i> ${time}`;
    
    if (type === 'start') {
        button.className = 'btn btn-success btn-sm time-btn';
        // تفعيل زر وقت النهاية
        const row = button.closest('tr');
        const endButton = row.querySelector('button[onclick*="end"]');
        endButton.disabled = false;
        
        // إضافة تأثير لزر النهاية
        endButton.style.transition = 'all 0.3s ease';
        endButton.style.transform = 'scale(1.05)';
        setTimeout(() => {
            endButton.style.transform = 'scale(1)';
        }, 200);
    } else {
        button.className = 'btn btn-danger btn-sm time-btn';
    }
    
    // تعطيل الزر الحالي
    button.disabled = true;
    
    // إضافة تأثير حركي
    button.style.transform = 'scale(1.1)';
    setTimeout(() => {
        button.style.transform = 'scale(1)';
    }, 200);
}

// حفظ البيانات في Local Storage
function saveToLocalStorage() {
    const rows = Array.from(document.querySelectorAll('#tableBody tr')).map(row => {
        const cells = row.querySelectorAll('td');
        return {
            name: cells[0].textContent,
            position: cells[1].textContent,
            startTime: cells[2].textContent,
            endTime: cells[3].textContent,
            notes: cells[4].textContent
        };
    });
    localStorage.setItem('ambulanceSchedule', JSON.stringify(rows));
}

// استرجاع البيانات من Local Storage
function loadFromLocalStorage() {
    const savedData = localStorage.getItem('ambulanceSchedule');
    if (savedData) {
        document.getElementById('tableBody').innerHTML = '';
        JSON.parse(savedData).forEach(row => addTableRow(row));
    }
}

// إضافة خاصية البحث في الجدول
function addTableSearch() {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'form-control mb-3';
    searchInput.placeholder = 'البحث عن اسم الموظف';
    searchInput.style.maxWidth = '300px';
    
    document.querySelector('.table').parentElement.insertBefore(searchInput, document.querySelector('.table'));
    
    searchInput.addEventListener('input', function() {
        const searchText = this.value.toLowerCase();
        const rows = document.querySelectorAll('#tableBody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchText) ? '' : 'none';
        });
    });
}

// وظائف معرض الصور
let currentPage = 0;
const imagesPerPage = 2;
let allImages = [];

document.querySelector('.add-image-btn').addEventListener('click', function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                addImageToGallery(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };
    
    input.click();
});

function addImageToGallery(imageUrl) {
    const imageCard = document.createElement('div');
    imageCard.className = 'image-card';
    
    imageCard.innerHTML = `
        <img src="${imageUrl}" alt="صورة جديدة">
        <div class="image-overlay">
            <span class="image-title">صورة جديدة</span>
        </div>
    `;
    
    allImages.push(imageCard);
    updateGalleryDisplay();
    updateNavigation();
}

function updateGalleryDisplay() {
    const imageGrid = document.querySelector('.image-grid');
    const startIdx = currentPage * imagesPerPage;
    const endIdx = startIdx + imagesPerPage;
    
    // إخفاء جميع الصور
    imageGrid.querySelectorAll('.image-card').forEach(card => {
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 300);
    });
    
    // إظهار الصور الحالية
    setTimeout(() => {
        imageGrid.innerHTML = '';
        allImages.slice(startIdx, endIdx).forEach(card => {
            const newCard = card.cloneNode(true);
            newCard.style.opacity = '0';
            imageGrid.appendChild(newCard);
            setTimeout(() => newCard.style.opacity = '1', 10);
        });
    }, 300);
}

function updateNavigation() {
    const navigation = document.querySelector('.gallery-navigation');
    const totalPages = Math.ceil(allImages.length / imagesPerPage);
    
    navigation.innerHTML = '';
    for (let i = 0; i < totalPages; i++) {
        const dot = document.createElement('div');
        dot.className = `nav-dot ${i === currentPage ? 'active' : ''}`;
        dot.addEventListener('click', () => {
            currentPage = i;
            updateGalleryDisplay();
            updateNavigation();
        });
        navigation.appendChild(dot);
    }
}

// تبديل تلقائي للصور كل 5 ثواني
setInterval(() => {
    if (allImages.length > imagesPerPage) {
        currentPage = (currentPage + 1) % Math.ceil(allImages.length / imagesPerPage);
        updateGalleryDisplay();
        updateNavigation();
    }
}, 5000);

// تهيئة المعرض
window.addEventListener('load', () => {
    // جمع الصور الموجودة
    document.querySelectorAll('.image-card').forEach(card => {
        allImages.push(card.cloneNode(true));
    });
    updateNavigation();
});

// وظائف حذف الصور
let deleteMode = false;

document.querySelector('.delete-image-btn').addEventListener('click', function() {
    const imageGrid = document.querySelector('.image-grid');
    deleteMode = !deleteMode;
    
    // تبديل حالة الزر
    this.classList.toggle('active');
    
    // تبديل وضع الحذف
    imageGrid.classList.toggle('delete-mode');
    
    // تحديث نص الزر
    const icon = this.querySelector('i');
    const text = this.textContent.trim();
    if (deleteMode) {
        this.innerHTML = `<i class="fas fa-times"></i> إلغاء الحذف`;
    } else {
        this.innerHTML = `<i class="fas fa-trash"></i> حذف صورة`;
    }
    
    // إضافة أو إزالة مستمعي الأحداث للصور
    const imageCards = document.querySelectorAll('.image-card');
    imageCards.forEach(card => {
        if (deleteMode) {
            card.addEventListener('click', deleteImage);
        } else {
            card.removeEventListener('click', deleteImage);
        }
    });
});

function deleteImage(event) {
    const card = event.currentTarget;
    
    // تأثير حذف متحرك
    card.style.transition = 'all 0.3s ease';
    card.style.transform = 'scale(0.8)';
    card.style.opacity = '0';
    
    setTimeout(() => {
        // حذف الصورة من المصفوفة
        const index = allImages.findIndex(img => img === card);
        if (index > -1) {
            allImages.splice(index, 1);
        }
        
        // حذف العنصر من DOM
        card.remove();
        
        // تحديث عرض المعرض والتنقل
        updateGalleryDisplay();
        updateNavigation();
        
        // إذا لم تتبق أي صور، إلغاء وضع الحذف
        if (allImages.length === 0) {
            document.querySelector('.delete-image-btn').click();
        }
    }, 300);
}

// تصدير الجدول إلى Excel
function exportToExcel() {
    const table = document.getElementById('ambulanceTable');
    const wb = XLSX.utils.table_to_book(table, { sheet: "جدول الإسعاف" });
    XLSX.writeFile(wb, 'جدول_الإسعاف.xlsx');
}

// دالة تسجيل الخروج
function logout() {
    // إظهار رسالة نجاح
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        تم تسجيل الخروج بنجاح
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(alertDiv);
    
    // مسح بيانات المستخدم
    localStorage.removeItem('adminData');
    sessionStorage.removeItem('adminData');
    sessionStorage.removeItem('employeeData');
    
    // الانتقال إلى صفحة تسجيل الدخول المناسبة
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

// التحقق من تسجيل الدخول عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    const adminData = localStorage.getItem('adminData') || sessionStorage.getItem('adminData');
    const employeeData = sessionStorage.getItem('employeeData');
    
    if (!adminData && !employeeData && !window.location.pathname.includes('login.html')) {
        // إذا لم يكن مسجل الدخول وليس في صفحة تسجيل الدخول
        window.location.href = 'login.html';
    }
});

// إضافة صورة جديدة
async function addImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const imageData = {
                        path: event.target.result,
                        title: file.name.split('.')[0],
                        date: new Date().toISOString()
                    };
                    
                    await db.saveImage(imageData);
                    await loadImages();
                };
                reader.readAsDataURL(file);
            } catch (error) {
                console.error('خطأ في إضافة الصورة:', error);
                showMessage('error', 'حدث خطأ أثناء إضافة الصورة');
            }
        }
    };
    
    input.click();
}

// حذف صورة
async function deleteImage(imageId) {
    if (confirm('هل أنت متأكد من حذف هذه الصورة؟')) {
        try {
            await db.deleteImage(imageId);
            await loadImages();
        } catch (error) {
            console.error('خطأ في حذف الصورة:', error);
            showMessage('error', 'حدث خطأ أثناء حذف الصورة');
        }
    }
}

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
                    ${isAdmin ? `
                        <button class="btn btn-danger btn-sm delete-image" onclick="deleteImage(${image.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            `;
            imageGrid.appendChild(imageCard);
        });
    } catch (error) {
        console.error('خطأ في تحميل الصور:', error);
        showMessage('error', 'حدث خطأ أثناء تحميل الصور');
    }
}

// إضافة أحداث الأزرار
document.addEventListener('DOMContentLoaded', () => {
    // أزرار إدارة الصور
    const addImageBtn = document.querySelector('.add-image-btn');
    if (addImageBtn) {
        addImageBtn.addEventListener('click', addImage);
    }
    
    // تحميل الصور عند بدء التطبيق
    loadImages();
});
