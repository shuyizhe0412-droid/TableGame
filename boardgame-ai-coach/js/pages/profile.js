/**
 * 桌游AI教练 - 个人中心页（占位）
 */
console.log('[profile.js] 文件开始加载');

App.registerPage('profile', (function() {
    // ==================== 状态管理 ====================
    var state = {
        isLoggedIn: false,
        user: null
    };

    // ==================== 渲染函数 ====================
    function renderHeader() {
        return '<div class="profile-header">' +
            '<div class="profile-avatar">' +
            (state.isLoggedIn ? '<img src="' + state.user.avatar + '" alt="avatar">' : '<span>👤</span>') +
            '</div>' +
            '<div class="profile-login-tip">登录后解锁更多功能</div>' +
            '</div>';
    }

    function renderMenuItem(icon, title, badge) {
        var badgeHtml = badge ? '<span class="menu-badge">' + badge + '</span>' : '';
        return '<div class="profile-menu-item">' +
            '<div class="menu-left">' +
            '<span class="menu-icon">' + icon + '</span>' +
            '<span class="menu-title">' + title + '</span>' +
            '</div>' +
            '<div class="menu-right">' +
            badgeHtml +
            '<span class="menu-arrow">即将上线</span>' +
            '</div>' +
            '</div>';
    }

    function renderMenu() {
        return '<div class="profile-menu">' +
            renderMenuItem('⭐', '我的收藏') +
            renderMenuItem('📜', '浏览记录') +
            renderMenuItem('⚙️', '设置') +
            '</div>';
    }

    function render() {
        return '<div class="profile-page" style="background:#12122a;min-height:100vh;padding-bottom:56px;">' +
            '<div class="profile-container">' +
            renderHeader() +
            renderMenu() +
            '</div>' +
            '</div>';
    }

    // ==================== 事件处理 ====================
    function goLogin() {
        // TODO: 跳转到登录页
        alert('登录功能即将上线');
    }

    // ==================== 初始化 ====================
    function init() {
        // 初始化用户状态
    }

    // 导出页面对象
    var page = {
        render: render,
        init: init,
        goLogin: goLogin
    };

    // 全局暴露
    window.profilePage = page;
    window.profilePageRender = function() {
        var app = document.getElementById('app');
        if (app) {
            app.innerHTML = page.render() + window.getTabBarHtml('profile');
            window.bindTabBarEvents();
            page.init();
        }
    };

    return page;
})());
