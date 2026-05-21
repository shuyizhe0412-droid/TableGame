/**
 * 桌游AI教练 - 应用入口模块
 * 负责页面挂载和路由初始化
 */

/**
 * 获取 TabBar HTML
 * @param {string} activeTab - 当前激活的 Tab
 * @returns {string} TabBar HTML 字符串
 */
function getTabBarHtml(activeTab) {
    const tabs = [
        { name: 'home', icon: '🏠', text: '首页' },
        { name: 'library', icon: '🎮', text: '游戏库' },
        { name: 'chat', icon: '🤖', text: 'AI' },
        { name: 'profile', icon: '👤', text: '我的' }
    ];

    const items = tabs.map(tab => {
        const isActive = activeTab === tab.name ? 'active' : '';
        return `<div class="tabbar-item ${isActive}" data-page="${tab.name}">
            <span class="tabbar-icon">${tab.icon}</span>
            <span class="tabbar-text">${tab.text}</span>
        </div>`;
    }).join('');

    return `<nav class="tabbar">${items}</nav>`;
}

// 绑定 TabBar 点击事件
function bindTabBarEvents() {
    document.querySelectorAll('.tabbar-item').forEach(function(item) {
        item.addEventListener('click', function() {
            navigate('/' + this.dataset.page);
        });
    });
}

// 全局暴露，供页面重新渲染时使用
window.getTabBarHtml = getTabBarHtml;
window.bindTabBarEvents = bindTabBarEvents;

/**
 * 渲染页面内容
 * @param {string} pageName - 页面名称
 * @param {object} params - URL 参数对象
 * @param {string} [activeTab] - TabBar 高亮覆盖名（如 chat-list 页面高亮 chat 标签）
 */
function renderPageContent(pageName, params, activeTab) {
    var app = document.getElementById('app');
    if (!app) return;

    // 从 pages.js 注册的映射表中获取页面组件
    var page = window._pages[pageName];
    if (!page || typeof page.render !== 'function') {
        app.innerHTML = '<div class="container"><h1>页面未找到: ' + pageName + '</h1></div>' + getTabBarHtml('home');
        return;
    }

    // 组合页面内容和 TabBar（部分页面不需要 TabBar）
    var content = page.render(params);
    var noTabBarPages = ['detail', 'chat'];
    var tabName = activeTab || pageName;
    var html = content + (noTabBarPages.indexOf(pageName) === -1 ? getTabBarHtml(tabName) : '');
    app.innerHTML = html;

    // 绑定 TabBar 点击事件
    bindTabBarEvents();

    // 调用页面初始化方法
    if (typeof page.init === 'function') {
        page.init(params);
    }
}

/**
 * 初始化应用
 */
function initApp() {
    // 初始化路由
    initRouter();

    // 路由到页面名的映射（/chat 无任何参数时映射到入口页）
    function resolvePage(route, params) {
        if (route === 'chat' && !params.id && !params.gameId && !params.mode) {
            return 'chat-list';
        }
        return route;
    }

    // 全局跳转辅助：从首页跳转到详情页时记录来源（供chat页返回使用）
    window.navigateToDetail = function(id, category) {
        if (id) {
            sessionStorage.setItem('chatFrom', '/detail?id=' + id);
        }
        if (category) {
            var recent = localStorage.getItem('recentCategories') || '';
            var cats = recent ? recent.split(',').filter(function(c) { return c !== category; }) : [];
            cats.unshift(category);
            localStorage.setItem('recentCategories', cats.slice(0, 5).join(','));
        }
        window.location.hash = '/detail?id=' + encodeURIComponent(id);
    };

    // 监听路由变化，渲染页面
    window.addEventListener('routechange', function(e) {
        var page = resolvePage(e.detail.page, e.detail.params);
        var tabOverride = (page === 'chat-list') ? 'chat' : null;
        renderPageContent(page, e.detail.params, tabOverride);
    });

    // 渲染初始页面
    var hashInfo = parseHash(window.location.hash);
    var page = resolvePage(hashInfo.route || 'home', hashInfo.params);
    var tabOverride = (page === 'chat-list') ? 'chat' : null;
    renderPageContent(page, hashInfo.params, tabOverride);
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);
