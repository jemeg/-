class Database {
    constructor() {
        this.dbName = 'MinistryHealthDB';
        this.dbVersion = 1;
        this.db = null;
    }

    // فتح الاتصال بقاعدة البيانات
    async openDB() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            let request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                let db = event.target.result;
                console.log('تحديث هيكل قاعدة البيانات');

                // إنشاء جدول البيانات
                if (!db.objectStoreNames.contains('scheduleData')) {
                    let scheduleStore = db.createObjectStore('scheduleData', {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    // إنشاء المؤشرات للبحث السريع
                    scheduleStore.createIndex('date', 'date');
                    scheduleStore.createIndex('shift', 'shift');
                    scheduleStore.createIndex('rank', 'rank');
                    scheduleStore.createIndex('name', 'name');
                }

                // إنشاء جدول السجل
                if (!db.objectStoreNames.contains('changelog')) {
                    let logStore = db.createObjectStore('changelog', {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    logStore.createIndex('timestamp', 'timestamp');
                    logStore.createIndex('userId', 'userId');
                    logStore.createIndex('action', 'action');
                    logStore.createIndex('date', 'date');
                }

                // إنشاء مخزن للصور
                if (!db.objectStoreNames.contains('images')) {
                    const imagesStore = db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
                    imagesStore.createIndex('path', 'path');
                    imagesStore.createIndex('title', 'title');
                }

                // إنشاء مخزن للمستخدمين
                if (!db.objectStoreNames.contains('users')) {
                    const usersStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    usersStore.createIndex('name', 'name');
                }
            };

            request.onerror = () => {
                console.error('خطأ في فتح قاعدة البيانات:', request.error);
                reject(request.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('تم فتح قاعدة البيانات بنجاح');

                // معالجة الأخطاء
                this.db.onerror = (event) => {
                    console.error('خطأ في قاعدة البيانات:', event.target.error);
                };

                resolve(this.db);
            };
        });
    }

    // الحصول على مخزن البيانات
    async getStore(storeName, mode = 'readonly') {
        const db = await this.openDB();
        const transaction = db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }

    // حفظ بيانات الجدول
    async saveScheduleData(data) {
        try {
            const store = await this.getStore('scheduleData', 'readwrite');
            
            // حذف البيانات القديمة
            await this.clearStore(store);

            // إضافة البيانات الجديدة مع الطابع الزمني
            const saveData = {
                ...data,
                lastModified: new Date().toISOString()
            };

            return new Promise((resolve, reject) => {
                let request = store.add(saveData);

                request.onsuccess = () => {
                    this.addToChangeLog({
                        action: 'save_schedule',
                        details: 'تم حفظ بيانات الجدول',
                        userId: this.getCurrentUser()
                    });
                    resolve(request.result);
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('خطأ في حفظ البيانات:', error);
            throw error;
        }
    }

    // استرجاع بيانات الجدول
    async getScheduleData() {
        try {
            const store = await this.getStore('scheduleData');
            
            return new Promise((resolve, reject) => {
                let request = store.getAll();

                request.onsuccess = () => {
                    resolve(request.result[0] || null);
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('خطأ في استرجاع البيانات:', error);
            throw error;
        }
    }

    // إضافة سجل تغيير
    async addToChangeLog(logData) {
        try {
            const store = await this.getStore('changelog', 'readwrite');
            
            const log = {
                ...logData,
                timestamp: new Date().toISOString(),
                date: new Date().toISOString().split('T')[0],
                userId: this.getCurrentUser()
            };

            return new Promise((resolve, reject) => {
                let request = store.add(log);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('خطأ في إضافة سجل:', error);
            throw error;
        }
    }

    // استرجاع سجل التغييرات مع الفلترة
    async getChangeLog(filters = {}) {
        try {
            const store = await this.getStore('changelog');
            
            return new Promise((resolve, reject) => {
                let request = store.index('timestamp').openCursor(null, 'prev');
                let logs = [];

                request.onsuccess = (event) => {
                    let cursor = event.target.result;
                    
                    if (cursor) {
                        let log = cursor.value;
                        let includeLog = true;

                        // تطبيق الفلاتر
                        if (filters.action && log.action !== filters.action) {
                            includeLog = false;
                        }
                        if (filters.userId && log.userId !== filters.userId) {
                            includeLog = false;
                        }
                        if (filters.dateFrom && new Date(log.timestamp) < new Date(filters.dateFrom)) {
                            includeLog = false;
                        }
                        if (filters.dateTo && new Date(log.timestamp) > new Date(filters.dateTo)) {
                            includeLog = false;
                        }

                        if (includeLog) {
                            logs.push(log);
                        }

                        cursor.continue();
                    } else {
                        resolve(logs);
                    }
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('خطأ في استرجاع السجل:', error);
            throw error;
        }
    }

    // البحث في البيانات
    async searchScheduleData(query) {
        try {
            const store = await this.getStore('scheduleData');
            
            return new Promise((resolve, reject) => {
                let request = store.getAll();

                request.onsuccess = () => {
                    let data = request.result;
                    let results = data.filter(item => 
                        Object.values(item).some(value => 
                            String(value).toLowerCase().includes(query.toLowerCase())
                        )
                    );
                    resolve(results);
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('خطأ في البحث:', error);
            throw error;
        }
    }

    // مسح مخزن البيانات
    async clearStore(store) {
        return new Promise((resolve, reject) => {
            let request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // الحصول على المستخدم الحالي
    getCurrentUser() {
        const adminData = localStorage.getItem('adminData') || sessionStorage.getItem('adminData');
        const employeeData = sessionStorage.getItem('employeeData');
        const userData = adminData ? JSON.parse(adminData) : JSON.parse(employeeData);
        return userData?.displayName || userData?.name || 'مستخدم مجهول';
    }

    // إغلاق قاعدة البيانات
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('تم إغلاق قاعدة البيانات');
        }
    }

    // حفظ صورة جديدة
    async saveImage(imageData) {
        try {
            const store = await this.getStore('images', 'readwrite');
            return new Promise((resolve, reject) => {
                const request = store.add(imageData);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('خطأ في حفظ الصورة:', error);
            throw error;
        }
    }

    // حذف صورة
    async deleteImage(imageId) {
        try {
            const store = await this.getStore('images', 'readwrite');
            return new Promise((resolve, reject) => {
                const request = store.delete(imageId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('خطأ في حذف الصورة:', error);
            throw error;
        }
    }

    // الحصول على جميع الصور
    async getAllImages() {
        try {
            const store = await this.getStore('images', 'readonly');
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('خطأ في استرجاع الصور:', error);
            throw error;
        }
    }

    // الحصول على جميع السجلات
    async getAllLogs() {
        try {
            const store = await this.getStore('changelog', 'readonly');
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const logs = request.result;
                    // فرز السجلات حسب التاريخ تنازلياً
                    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    resolve(logs);
                };
                
                request.onerror = () => {
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('خطأ في جلب السجلات:', error);
            throw error;
        }
    }

    // إضافة سجل تواجد جديد
    async addAttendanceLog(userId, userName, action) {
        try {
            const store = await this.getStore('changelog', 'readwrite');
            const timestamp = new Date().toISOString();
            
            const logEntry = {
                userId,
                userName,
                action, // 'check_in' or 'check_out'
                timestamp,
                details: `${action === 'check_in' ? 'تسجيل حضور' : 'تسجيل انصراف'}`
            };
            
            return new Promise((resolve, reject) => {
                const request = store.add(logEntry);
                
                request.onsuccess = () => {
                    resolve(logEntry);
                };
                
                request.onerror = () => {
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('خطأ في إضافة سجل التواجد:', error);
            throw error;
        }
    }

    // الحصول على سجلات التواجد لمستخدم معين
    async getUserAttendanceLogs(userId) {
        try {
            const store = await this.getStore('changelog', 'readonly');
            const logs = await this.getAllLogs();
            
            return logs.filter(log => 
                log.userId === userId && 
                (log.action === 'check_in' || log.action === 'check_out')
            );
        } catch (error) {
            console.error('خطأ في جلب سجلات التواجد للمستخدم:', error);
            throw error;
        }
    }

    // إضافة مستخدم جديد مع تتبع ساعات التواجد
    async addUser(userData) {
        try {
            const store = await this.getStore('users', 'readwrite');
            const user = {
                ...userData,
                attendance: {
                    totalHours: 0,
                    lastCheckIn: null,
                    isCheckedIn: false
                }
            };
            
            return new Promise((resolve, reject) => {
                const request = store.add(user);
                request.onsuccess = () => resolve(user);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('خطأ في إضافة المستخدم:', error);
            throw error;
        }
    }

    // تسجيل حضور المستخدم
    async checkIn(userId) {
        try {
            const store = await this.getStore('users', 'readwrite');
            const user = await this.getUserById(userId);
            
            if (!user) throw new Error('المستخدم غير موجود');
            if (user.attendance.isCheckedIn) throw new Error('المستخدم مسجل حضور بالفعل');
            
            const timestamp = new Date().toISOString();
            user.attendance.lastCheckIn = timestamp;
            user.attendance.isCheckedIn = true;
            
            // تحديث بيانات المستخدم
            await this.updateUser(userId, user);
            
            // إضافة سجل الحضور
            await this.addAttendanceLog(userId, user.name, 'check_in');
            
            return user;
        } catch (error) {
            console.error('خطأ في تسجيل الحضور:', error);
            throw error;
        }
    }

    // تسجيل انصراف المستخدم
    async checkOut(userId) {
        try {
            const store = await this.getStore('users', 'readwrite');
            const user = await this.getUserById(userId);
            
            if (!user) throw new Error('المستخدم غير موجود');
            if (!user.attendance.isCheckedIn) throw new Error('المستخدم لم يسجل حضور بعد');
            
            const checkOutTime = new Date();
            const checkInTime = new Date(user.attendance.lastCheckIn);
            const hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);
            
            user.attendance.totalHours += hoursWorked;
            user.attendance.lastCheckIn = null;
            user.attendance.isCheckedIn = false;
            
            // تحديث بيانات المستخدم
            await this.updateUser(userId, user);
            
            // إضافة سجل الانصراف
            await this.addAttendanceLog(userId, user.name, 'check_out');
            
            return user;
        } catch (error) {
            console.error('خطأ في تسجيل الانصراف:', error);
            throw error;
        }
    }

    // الحصول على إحصائيات التواجد لجميع المستخدمين
    async getAllUsersAttendance() {
        try {
            const store = await this.getStore('users', 'readonly');
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const users = request.result;
                    const attendanceStats = users.map(user => ({
                        userId: user.id,
                        name: user.name,
                        totalHours: user.attendance?.totalHours || 0,
                        isCheckedIn: user.attendance?.isCheckedIn || false,
                        lastCheckIn: user.attendance?.lastCheckIn || null
                    }));
                    resolve(attendanceStats);
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('خطأ في جلب إحصائيات التواجد:', error);
            throw error;
        }
    }

    // تحديث بيانات المستخدم
    async updateUser(userId, userData) {
        try {
            const store = await this.getStore('users', 'readwrite');
            return new Promise((resolve, reject) => {
                const request = store.put(userData);
                request.onsuccess = () => resolve(userData);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('خطأ في تحديث بيانات المستخدم:', error);
            throw error;
        }
    }

    // الحصول على مستخدم حسب الـ ID
    async getUserById(userId) {
        try {
            const store = await this.getStore('users', 'readonly');
            return new Promise((resolve, reject) => {
                const request = store.get(userId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('خطأ في جلب بيانات المستخدم:', error);
            throw error;
        }
    }
}

// إنشاء نسخة واحدة من قاعدة البيانات
const db = new Database();

// إغلاق قاعدة البيانات عند إغلاق الصفحة
window.addEventListener('unload', () => {
    db.close();
});
