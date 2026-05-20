/**
 * 桌游AI教练 - 页面注册器（必须在所有页面文件之前加载）
 */

// 页面组件映射表
window._pages = {};

/**
 * 注册页面组件
 * @param {string} name - 页面名称
 * @param {object} component - 页面组件对象 { render, init }
 */
window.App = {
    registerPage: function(name, component) {
        window._pages[name] = component;
    }
};
