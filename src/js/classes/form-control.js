import { $, extend, mobiscroll } from '../core/core';
import { getCoord, tap, triggerClick } from '../util/tap';
import { testTouch, hasTouchAction } from '../util/dom';

const wrapClass = 'mbsc-input-wrap';
const events = ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'mousedown', 'mousemove', 'mouseup', 'mouseleave'];
const defaults = {
    tap: !hasTouchAction
};

let $active;

function addIcon($control, ic) {
    var icons = {},
        $parent = $control.parent(),
        errorMsg = $parent.find('.mbsc-err-msg'),
        align = $control.attr('data-icon-align') || 'left',
        icon = $control.attr('data-icon');

    if ($parent.hasClass(wrapClass)) {
        $parent = $parent.parent();
    } else {
        // Wrap input
        $('<span class="' + wrapClass + '"></span>').insertAfter($control).append($control);
    }

    if (errorMsg) {
        $parent.find('.' + wrapClass).append(errorMsg);
    }

    if (icon) {
        if (icon.indexOf('{') !== -1) {
            icons = JSON.parse(icon);
        } else {
            icons[align] = icon;
        }
    }

    if (icon || ic) {
        extend(icons, ic);

        $parent
            .addClass((icons.right ? 'mbsc-ic-right ' : '') + (icons.left ? ' mbsc-ic-left' : ''))
            .find('.' + wrapClass)
            .append(icons.left ? '<span class="mbsc-input-ic mbsc-left-ic mbsc-ic mbsc-ic-' + icons.left + '"></span>' : '')
            .append(icons.right ? '<span class="mbsc-input-ic mbsc-right-ic mbsc-ic mbsc-ic-' + icons.right + '"></span>' : '');
    }
}

function addIconToggle(that, $parent, $control) {
    var icons = {},
        control = $control[0],
        toggle = $control.attr('data-password-toggle'),
        iconShow = $control.attr('data-icon-show') || 'eye',
        iconHide = $control.attr('data-icon-hide') || 'eye-blocked';

    if (toggle) {
        icons.right = control.type == 'password' ? iconShow : iconHide;
    }

    addIcon($control, icons);

    if (toggle) {
        tap(that, $parent.find('.mbsc-right-ic').addClass('mbsc-input-toggle'), function () {
            if (control.type == "text") {
                control.type = "password";
                $(this).addClass('mbsc-ic-' + iconShow).removeClass('mbsc-ic-' + iconHide);
            } else {
                control.type = "text";
                $(this).removeClass('mbsc-ic-' + iconShow).addClass('mbsc-ic-' + iconHide);
            }
        });
    }
}

function wrapLabel($parent, type) {
    // Wrap non-empty text nodes in span with mbsc-label class
    if (type != 'button' && type != 'submit' && type != 'segmented') {
        $parent
            .addClass('mbsc-control-w')
            .find('label')
            .addClass('mbsc-label')
            .each(function (i, v) {
                $(v).attr('title', $(v).text());
            });

        $parent.contents().filter(function () {
            return this.nodeType == 3 && this.nodeValue && /\S/.test(this.nodeValue);
        }).each(function () {
            $('<span class="mbsc-label" title="' + this.textContent.trim() + '"></span>').insertAfter(this).append(this);
        });
    }
}

function getControlType($elm) {
    const elm = $elm[0];
    const role = $elm.attr('data-role');

    let type = $elm.attr('type') || elm.nodeName.toLowerCase();

    if (/(switch|range|rating|segmented|stepper)/.test(role)) {
        type = role;
    }

    return type;
}

function getRipple(theme) {
    const ripple = mobiscroll.themes.form[theme];
    return ripple && ripple.addRipple ? ripple : null;
}

export class FormControl {
    constructor(elm, settings) {

        const s = extend({}, defaults, mobiscroll.settings, settings);
        const $elm = $(elm);
        const $p = $elm.parent();
        const $parent = $p.hasClass('mbsc-input-wrap') ? $p.parent() : $p;
        // Check for inline mobiscroll components
        const $frame = $elm.next().hasClass('mbsc-fr') ? $elm.next() : null;
        const type = getControlType($elm);

        if ($frame) {
            $frame.insertAfter($parent);
        }

        wrapLabel($parent, type);

        $elm.addClass('mbsc-control');

        // Attach events
        // Prevent 300ms click latency
        events.forEach(ev => {
            elm.addEventListener(ev, this);
        });

        this.settings = s;

        this._type = type;
        this._elm = elm;
        this._$elm = $elm;
        this._$parent = $parent;
        this._$frame = $frame;
        this._ripple = getRipple(s.theme);

        elm.mbscInst = this;
    }

    destroy() {
        this._$elm.removeClass('mbsc-control');
        events.forEach(ev => {
            this._elm.removeEventListener(ev, this);
        });
        delete this._elm.mbscInst;
    }

    option(s) {
        extend(this.settings, s);
        this._ripple = getRipple(this.settings.theme);
    }

    handleEvent(ev) {
        switch (ev.type) {
            case 'touchstart':
            case 'mousedown':
                this._onStart(ev);
                break;
            case 'touchmove':
            case 'mousemove':
                this._onMove(ev);
                break;
            case 'touchend':
            case 'touchcancel':
            case 'mouseup':
            case 'mouseleave':
                this._onEnd(ev);
        }
    }

    _addRipple(ev) {
        if (this._ripple && this._$rippleElm) {
            this._ripple.addRipple(this._$rippleElm, ev);
        }
    }

    _removeRipple() {
        if (this._ripple && this._$rippleElm) {
            this._ripple.removeRipple();
        }
    }

    _onStart(ev) {
        const elm = this._elm;

        if (testTouch(ev, elm)) {
            this._startX = getCoord(ev, 'X');
            this._startY = getCoord(ev, 'Y');

            if ($active) {
                $active.removeClass('mbsc-active');
            }

            if (!elm.disabled) {
                this._isActive = true;
                $active = this._$elm;
                $active.addClass('mbsc-active');
                this._addRipple(ev);
            }
        }
    }

    _onMove(ev) {
        // If movement is more than 9px, don't fire the click event handler
        if (this._isActive && Math.abs(getCoord(ev, 'X') - this._startX) > 9 || Math.abs(getCoord(ev, 'Y') - this._startY) > 9) {
            this._$elm.removeClass('mbsc-active');
            this._removeRipple();
            this._isActive = false;
        }
    }

    _onEnd(ev) {
        const control = this._elm;
        const type = this._type;

        if (this._isActive && this.settings.tap && ev.type == 'touchend' && !control.readOnly) {
            control.focus();

            if (/(button|submit|checkbox|switch|radio)/.test(type)) {
                ev.preventDefault();
            }

            if (!/select/.test(type)) {
                triggerClick(ev, control);
            }
        }

        if (this._isActive) {
            setTimeout(() => {
                this._$elm.removeClass('mbsc-active');
                this._removeRipple();
            }, 100);
        }

        this._isActive = false;

        $active = null;
    }
}

export {
    addIcon,
    addIconToggle,
    getControlType,
    wrapLabel
};
