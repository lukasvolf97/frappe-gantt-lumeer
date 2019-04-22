var Gantt = (function () {
    'use strict';

    const YEAR = 'year';
    const MONTH = 'month';
    const DAY = 'day';
    const HOUR = 'hour';
    const MINUTE = 'minute';
    const SECOND = 'second';
    const MILLISECOND = 'millisecond';

    const month_names = {
        en: [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December'
        ],
        ru: [
            'Январь',
            'Февраль',
            'Март',
            'Апрель',
            'Май',
            'Июнь',
            'Июль',
            'Август',
            'Сентябрь',
            'Октябрь',
            'Ноябрь',
            'Декабрь'
        ],
        ptBr: [
            'Janeiro',
            'Fevereiro',
            'Março',
            'Abril',
            'Maio',
            'Junho',
            'Julho',
            'Agosto',
            'Setembro',
            'Outubro',
            'Novembro',
            'Dezembro'
        ]
    };

    var date_utils = {
        parse(date, date_separator = '-', time_separator = /[.:]/) {
            if (date instanceof Date) {
                return date;
            }
            if (typeof date === 'string') {
                let date_parts, time_parts;
                const parts = date.split(' ');

                date_parts = parts[0]
                    .split(date_separator)
                    .map(val => parseInt(val, 10));
                time_parts = parts[1] && parts[1].split(time_separator);

                // month is 0 indexed
                date_parts[1] = date_parts[1] - 1;

                let vals = date_parts;

                if (time_parts && time_parts.length) {
                    if (time_parts.length == 4) {
                        time_parts[3] = '0.' + time_parts[3];
                        time_parts[3] = parseFloat(time_parts[3]) * 1000;
                    }
                    vals = vals.concat(time_parts);
                }

                return new Date(...vals);
            }
        },

        to_string(date, with_time = false) {
            if (!(date instanceof Date)) {
                throw new TypeError('Invalid argument type');
            }
            const vals = this.get_date_values(date).map((val, i) => {
                if (i === 1) {
                    // add 1 for month
                    val = val + 1;
                }

                if (i === 6) {
                    return padStart(val + '', 3, '0');
                }

                return padStart(val + '', 2, '0');
            });
            const date_string = `${vals[0]}-${vals[1]}-${vals[2]}`;
            const time_string = `${vals[3]}:${vals[4]}:${vals[5]}.${vals[6]}`;

            return date_string + (with_time ? ' ' + time_string : '');
        },

        format(date, format_string = 'YYYY-MM-DD HH:mm:ss.SSS', lang = 'en') {
            const values = this.get_date_values(date).map(d => padStart(d, 2, 0));
            const format_map = {
                YYYY: values[0],
                MM: padStart(+values[1] + 1, 2, 0),
                DD: values[2],
                HH: values[3],
                mm: values[4],
                ss: values[5],
                SSS:values[6],
                D: values[2],
                MMMM: month_names[lang][+values[1]],
                MMM: month_names[lang][+values[1]]
            };

            let str = format_string;
            const formatted_values = [];

            Object.keys(format_map)
                .sort((a, b) => b.length - a.length) // big string first
                .forEach(key => {
                    if (str.includes(key)) {
                        str = str.replace(key, `$${formatted_values.length}`);
                        formatted_values.push(format_map[key]);
                    }
                });

            formatted_values.forEach((value, i) => {
                str = str.replace(`$${i}`, value);
            });

            return str;
        },

        diff(date_a, date_b, scale = DAY) {
            let milliseconds, seconds, hours, minutes, days, months, years;

            milliseconds = date_a - date_b;
            seconds = milliseconds / 1000;
            minutes = seconds / 60;
            hours = minutes / 60;
            days = hours / 24;
            months = days / 30;
            years = months / 12;

            if (!scale.endsWith('s')) {
                scale += 's';
            }

            return Math.floor(
                {
                    milliseconds,
                    seconds,
                    minutes,
                    hours,
                    days,
                    months,
                    years
                }[scale]
            );
        },

        today() {
            const vals = this.get_date_values(new Date()).slice(0, 3);
            return new Date(...vals);
        },

        now() {
            return new Date();
        },

        add(date, qty, scale) {
            qty = parseInt(qty, 10);
            const vals = [
                date.getFullYear() + (scale === YEAR ? qty : 0),
                date.getMonth() + (scale === MONTH ? qty : 0),
                date.getDate() + (scale === DAY ? qty : 0),
                date.getHours() + (scale === HOUR ? qty : 0),
                date.getMinutes() + (scale === MINUTE ? qty : 0),
                date.getSeconds() + (scale === SECOND ? qty : 0),
                date.getMilliseconds() + (scale === MILLISECOND ? qty : 0)
            ];
            return new Date(...vals);
        },

        start_of(date, scale) {
            const scores = {
                [YEAR]: 6,
                [MONTH]: 5,
                [DAY]: 4,
                [HOUR]: 3,
                [MINUTE]: 2,
                [SECOND]: 1,
                [MILLISECOND]: 0
            };

            function should_reset(_scale) {
                const max_score = scores[scale];
                return scores[_scale] <= max_score;
            }

            const vals = [
                date.getFullYear(),
                should_reset(YEAR) ? 0 : date.getMonth(),
                should_reset(MONTH) ? 1 : date.getDate(),
                should_reset(DAY) ? 0 : date.getHours(),
                should_reset(HOUR) ? 0 : date.getMinutes(),
                should_reset(MINUTE) ? 0 : date.getSeconds(),
                should_reset(SECOND) ? 0 : date.getMilliseconds()
            ];

            return new Date(...vals);
        },

        clone(date) {
            return new Date(...this.get_date_values(date));
        },

        get_date_values(date) {
            return [
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
                date.getHours(),
                date.getMinutes(),
                date.getSeconds(),
                date.getMilliseconds()
            ];
        },

        get_days_in_month(date) {
            const no_of_days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

            const month = date.getMonth();

            if (month !== 1) {
                return no_of_days[month];
            }

            // Feb
            const year = date.getFullYear();
            if ((year % 4 == 0 && year % 100 != 0) || year % 400 == 0) {
                return 29;
            }
            return 28;
        }
    };

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart
    function padStart(str, targetLength, padString) {
        str = str + '';
        targetLength = targetLength >> 0;
        padString = String(typeof padString !== 'undefined' ? padString : ' ');
        if (str.length > targetLength) {
            return String(str);
        } else {
            targetLength = targetLength - str.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(targetLength / padString.length);
            }
            return padString.slice(0, targetLength) + String(str);
        }
    }

    function $(expr, con) {
        return typeof expr === 'string'
            ? (con || document).querySelector(expr)
            : expr || null;
    }

    function createSVG(tag, attrs) {
        const elem = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (let attr in attrs) {
            if (attr === 'append_to') {
                const parent = attrs.append_to;
                parent.appendChild(elem);
            } else if (attr === 'innerHTML') {
                elem.innerHTML = attrs.innerHTML;
            } else {
                elem.setAttribute(attr, attrs[attr]);
            }
        }
        return elem;
    }

    function animateSVG(svgElement, attr, from, to) {
        const animatedSvgElement = getAnimationElement(svgElement, attr, from, to);

        if (animatedSvgElement === svgElement) {
            // triggered 2nd time programmatically
            // trigger artificial click event
            const event = document.createEvent('HTMLEvents');
            event.initEvent('click', true, true);
            event.eventName = 'click';
            animatedSvgElement.dispatchEvent(event);
        }
    }

    function getAnimationElement(
        svgElement,
        attr,
        from,
        to,
        dur = '0.4s',
        begin = '0.1s'
    ) {
        const animEl = svgElement.querySelector('animate');
        if (animEl) {
            $.attr(animEl, {
                attributeName: attr,
                from,
                to,
                dur,
                begin: 'click + ' + begin // artificial click
            });
            return svgElement;
        }

        const animateElement = createSVG('animate', {
            attributeName: attr,
            from,
            to,
            dur,
            begin,
            calcMode: 'spline',
            values: from + ';' + to,
            keyTimes: '0; 1',
            keySplines: cubic_bezier('ease-out')
        });
        svgElement.appendChild(animateElement);

        return svgElement;
    }

    function cubic_bezier(name) {
        return {
            ease: '.25 .1 .25 1',
            linear: '0 0 1 1',
            'ease-in': '.42 0 1 1',
            'ease-out': '0 0 .58 1',
            'ease-in-out': '.42 0 .58 1'
        }[name];
    }

    $.on = (element, event, selector, callback) => {
        if (!callback) {
            callback = selector;
            $.bind(element, event, callback);
        } else {
            $.delegate(element, event, selector, callback);
        }
    };

    $.off = (element, event, handler) => {
        element.removeEventListener(event, handler);
    };

    $.bind = (element, event, callback) => {
        event.split(/\s+/).forEach(function(event) {
            element.addEventListener(event, callback);
        });
    };

    $.delegate = (element, event, selector, callback) => {
        element.addEventListener(event, function(e) {
            const delegatedTarget = e.target.closest(selector);
            if (delegatedTarget) {
                e.delegatedTarget = delegatedTarget;
                callback.call(this, e, delegatedTarget);
            }
        });
    };

    $.closest = (selector, element) => {
        if (!element) return null;

        if (element.matches(selector)) {
            return element;
        }

        return $.closest(selector, element.parentNode);
    };

    $.attr = (element, attr, value) => {
        if (!value && typeof attr === 'string') {
            return element.getAttribute(attr);
        }

        if (typeof attr === 'object') {
            for (let key in attr) {
                $.attr(element, key, attr[key]);
            }
            return;
        }

        element.setAttribute(attr, value);
    };

    class Bar {
        constructor(gantt, task) {
            this.set_defaults(gantt, task);
            this.prepare();
            this.draw();
            this.bind();
        }

        set_defaults(gantt, task) {
            this.action_completed = false;
            this.gantt = gantt;
            this.task = task;
        }

        prepare() {
            this.prepare_values();
            this.prepare_helpers();
        }

        prepare_values() {
            this.invalid = this.task.invalid;
            this.height = this.gantt.options.bar_height;
            this.x = this.compute_x();
            this.y = this.compute_y();
            this.corner_radius = this.gantt.options.bar_corner_radius;
            this.duration =
                date_utils.diff(this.task._end, this.task._start, 'hour') /
                this.gantt.options.step;
            this.width = this.gantt.options.column_width * this.duration;
            this.progress_width =
                this.gantt.options.column_width *
                    this.duration *
                    (this.task.progress / 100) || 0;
            this.group = createSVG('g', {
                class: 'bar-wrapper ' + (this.task.custom_class || ''),
                'data-id': this.task.id,
                id: this.task.id
            });
            this.inner_bar_group = createSVG('g', {
                append_to: this.group
            });
            this.bar_group = createSVG('g', {
                class: 'bar-group',
                append_to: this.inner_bar_group
            });
            this.handle_group = createSVG('g', {
                class: 'handle-group',
                append_to: this.inner_bar_group
            });
            this.endpoint_group = createSVG('g', {
                class: 'endpoint-group',
                append_to: this.group
            });
        }

        prepare_helpers() {
            SVGElement.prototype.getX = function() {
                return +this.getAttribute('x');
            };
            SVGElement.prototype.getY = function() {
                return +this.getAttribute('y');
            };
            SVGElement.prototype.getWidth = function() {
                return +this.getAttribute('width');
            };
            SVGElement.prototype.getHeight = function() {
                return +this.getAttribute('height');
            };
            SVGElement.prototype.getEndX = function() {
                return this.getX() + this.getWidth();
            };
        }

        draw() {
            this.draw_bar();
            this.draw_progress_bar();
            this.draw_label();
            this.draw_resize_handles();
            this.draw_endpoints();
        }

        draw_bar() {
            this.$bar = createSVG('rect', {
                x: this.x,
                y: this.y,
                width: this.width,
                height: this.height,
                rx: this.corner_radius,
                ry: this.corner_radius,
                class: 'bar',
                style: (this.task.primary_color) ? 'fill:' + this.task.primary_color : '',
                append_to: this.bar_group
            }); 

            animateSVG(this.$bar, 'width', 0, this.width);

            if (this.invalid) {
                this.$bar.classList.add('bar-invalid');
            }

        }

        draw_progress_bar() {
            if (this.invalid) return;
            let bar_progress_width = this.progress_width;
            let bar_progress_inner_width = this.progress_width >= this.width ? this.width : this.progress_width;
            this.$bar_progress = createSVG('rect', {
                x: this.x,
                y: this.y,
                width: bar_progress_width,
                height: this.height,
                rx: this.corner_radius,
                ry: this.corner_radius,
                class: 'bar-progress',
                style: ((this.task.secondary_color) ? 'fill:' + this.task.secondary_color + '; ': '') + 'opacity: 0.5',
                append_to: this.bar_group
            });
            this.$bar_progress_inner = createSVG('rect', {
                x: this.x,
                y: this.y,
                width: bar_progress_inner_width,
                height: this.height,
                rx: this.corner_radius,
                ry: this.corner_radius,
                class: 'bar-progress',
                style: (this.task.secondary_color) ? 'fill:' + this.task.secondary_color + '; ' : '',
                append_to: this.bar_group
            });

            animateSVG(this.$bar_progress_inner, 'width', 0, bar_progress_inner_width);
            animateSVG(this.$bar_progress, 'width', 0, bar_progress_width);
             
        }

        draw_label() {
            createSVG('text', {
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                style: (this.task.text_color) ? 'fill:' + this.task.text_color + '; ' : '',
                innerHTML: this.task.name,
                class: 'bar-label',
                append_to: this.bar_group
            });
            // labels get BBox in the next tick
            requestAnimationFrame(() => this.update_label_position());
        }

        draw_resize_handles() {
            if (this.invalid) return;

            const bar = this.$bar;
            const handle_width = 8;

            createSVG('rect', {
                x: bar.getX() + bar.getWidth() - 9,
                y: bar.getY() + 1,
                width: handle_width,
                height: this.height - 2,
                rx: this.corner_radius,
                ry: this.corner_radius,
                class: 'handle right',
                append_to: this.handle_group
            });

            createSVG('rect', {
                x: bar.getX() + 1,
                y: bar.getY() + 1,
                width: handle_width,
                height: this.height - 2,
                rx: this.corner_radius,
                ry: this.corner_radius,
                class: 'handle left',
                append_to: this.handle_group
            });

            if (this.task.progress) {
                this.$handle_progress = createSVG('polygon', {
                    points: this.get_progress_polygon_points().join(','),
                    class: 'handle progress',
                    append_to: this.handle_group
                });
            }
        }

        draw_endpoints() {
            if (this.invalid) return;

            const bar = this.$bar;
            const endpoint_r = 4;

            this.$endpoint_end = createSVG('circle', {
                cx: bar.getEndX() + endpoint_r * 2,
                cy: bar.getY() + bar.getHeight() / 2,
                r: endpoint_r,
                class: 'endpoint end',
                append_to: this.endpoint_group
            });

            this.$endpoint_start = createSVG('circle', {
                cx: bar.getX() - endpoint_r * 2,
                cy: bar.getY() + bar.getHeight() / 2,
                r: endpoint_r,
                class: 'endpoint start',
                append_to: this.endpoint_group
            });
        }

        get_progress_polygon_points() {
            const bar_progress = this.$bar_progress;
            return [
                bar_progress.getEndX() - 5,
                bar_progress.getY() + bar_progress.getHeight(),
                bar_progress.getEndX() + 5,
                bar_progress.getY() + bar_progress.getHeight(),
                bar_progress.getEndX(),
                bar_progress.getY() + bar_progress.getHeight() - 8.66
            ];
        }

        bind() {
            if (this.invalid) return;
            this.setup_click_event();
        }

        setup_click_event() {
            $.on(this.inner_bar_group, 'focus ' + this.gantt.options.popup_trigger, e => {
                if (this.action_completed) {
                    // just finished a move action, wait for a few seconds
                    return;
                }
                if (e.type === 'click') {
                    this.gantt.trigger_event('click', [this.task]);
                }

                this.gantt.unselect_all();
                this.group.classList.toggle('active');

                this.show_popup();
            });
        }

        show_popup() {
            if (this.gantt.bar_being_dragged) return;

            const start_date = date_utils.format(this.task._start, 'MMM D');
            const end_date = date_utils.format(
                date_utils.add(this.task._end, -1, 'second'),
                'MMM D'
            );
            const subtitle = start_date + ' - ' + end_date;

            this.gantt.show_popup({
                target_element: this.$bar,
                title: this.task.name,
                subtitle: subtitle,
                task: this.task
            });
        }

        update_bar_position({ x = null, width = null }) {
            const bar = this.$bar;
            if (x) {
                // get all x values of parent task
                const xs = this.task.dependencies.map(dep => {
                    return this.gantt.get_bar(dep).$bar.getX();
                });
                // child task must not go before parent
                const valid_x = xs.reduce((prev, curr) => {
                    return x >= curr;
                }, x);
                if (!valid_x) {
                    width = null;
                    return;
                }
                this.update_attr(bar, 'x', x);
            }
            if (width && width >= this.gantt.options.column_width) {
                this.update_attr(bar, 'width', width);
            }
            this.update_label_position();
            this.update_handle_position();

            let new_width = this.$bar.getWidth() * (this.task.progress / 100);
            this.update_progressbar_position(this.$bar_progress, new_width);
            this.update_progressbar_position(this.$bar_progress_inner, new_width > this.$bar.getWidth() ? this.$bar.getWidth() : new_width);

            this.update_arrow_position();
            this.update_endpoints_position();
        }

        date_changed() {
            let changed = false;
            const { new_start_date, new_end_date } = this.compute_start_end_date();

            if (Number(this.task._start) !== Number(new_start_date)) {
                changed = true;
                this.task._start = new_start_date;
            }

            if (Number(this.task._end) !== Number(new_end_date)) {
                changed = true;
                this.task._end = new_end_date;
            }


            if (!changed) return;

            this.gantt.trigger_event('date_change', [
                this.task,
                new_start_date,
                date_utils.add(new_end_date, -1, 'second')
            ]);
        }

        progress_changed() {
            const new_progress = this.compute_progress();
            this.task.progress = new_progress;
            this.gantt.trigger_event('progress_change', [this.task, new_progress]);
        }

        set_action_completed() {
            this.action_completed = true;
            if (this.timer == undefined) {
                this.timer = setTimeout(() => {
                    this.action_completed = false;
                    this.timer = undefined;
                }, 1000);
            }
        }

        compute_start_end_date() {
            const bar = this.$bar;
            const x_in_units = bar.getX() / this.gantt.options.column_width;
            const new_start_date = date_utils.add(
                this.gantt.gantt_start,
                x_in_units * this.gantt.options.step,
                'hour'
            );
            const width_in_units = bar.getWidth() / this.gantt.options.column_width;
            const new_end_date = date_utils.add(
                new_start_date,
                width_in_units * this.gantt.options.step,
                'hour'
            );

            return { new_start_date, new_end_date };
        }

        compute_progress() {
            const progress =
                this.$bar_progress.getWidth() / this.$bar.getWidth() * 100;
            return parseInt(progress, 10);
        }

        compute_x() {
            const { step, column_width } = this.gantt.options;
            const task_start = this.task._start;
            const gantt_start = this.gantt.gantt_start;

            const diff = date_utils.diff(task_start, gantt_start, 'hour');
            let x = diff / step * column_width;

            if (this.gantt.view_is('Month')) {
                const diff = date_utils.diff(task_start, gantt_start, 'day');
                x = diff * column_width / 30;
            }
            return x;
        }

        compute_y() {
            return (
                this.gantt.options.header_height +
                this.gantt.options.padding +
                this.task._index * (this.height + this.gantt.options.padding)
            );
        }

        get_snap_position(dx) {
            let odx = dx,
                rem,
                position;

            if (this.gantt.view_is('Week')) {
                rem = dx % (this.gantt.options.column_width / 7);
                position =
                    odx -
                    rem +
                    (rem < this.gantt.options.column_width / 14
                        ? 0
                        : this.gantt.options.column_width / 7);
            } else if (this.gantt.view_is('Month')) {
                rem = dx % (this.gantt.options.column_width / 30);
                position =
                    odx -
                    rem +
                    (rem < this.gantt.options.column_width / 60
                        ? 0
                        : this.gantt.options.column_width / 30);
            } else {
                rem = dx % this.gantt.options.column_width;
                position =
                    odx -
                    rem +
                    (rem < this.gantt.options.column_width / 2
                        ? 0
                        : this.gantt.options.column_width);
            }
            return position;
        }

        update_attr(element, attr, value) {
            value = +value;
            if (!isNaN(value)) {
                element.setAttribute(attr, value);
            }
            return element;
        }

        update_progressbar_position(bar_progress, width) {
            bar_progress.setAttribute('x', this.$bar.getX());
            bar_progress.setAttribute('width',width);
        }

        update_label_position() {
            const bar = this.$bar,
                label = this.group.querySelector('.bar-label');

            if (label.getBBox().width > bar.getWidth()) {
                label.classList.add('big');
                label.setAttribute('x', bar.getX() + bar.getWidth() + 5);
            } else {
                label.classList.remove('big');
                label.setAttribute('x', bar.getX() + bar.getWidth() / 2);
            }
        }

        update_handle_position() {
            const bar = this.$bar;
            this.handle_group
                .querySelector('.handle.left')
                .setAttribute('x', bar.getX() + 1);
            this.handle_group
                .querySelector('.handle.right')
                .setAttribute('x', bar.getEndX() - 9);
            const handle = this.group.querySelector('.handle.progress');
            handle &&
                handle.setAttribute('points', this.get_progress_polygon_points());
        }

        update_arrow_position() {
            this.arrows = this.arrows || [];
            for (let arrow of this.arrows) {
                arrow.update();
            }
        }

        update_endpoints_position() {
            const bar = this.$bar;
            this.endpoint_group
                .querySelector('.endpoint.start')
                .setAttribute('cx', bar.getX() - 8);
            this.endpoint_group
                .querySelector('.endpoint.end')
                .setAttribute('cx', bar.getEndX() + 8);
        }

    }

    class Arrow {
        constructor(gantt, from_task, to_task) {
            this.gantt = gantt;
            this.from_task = from_task;
            this.to_task = to_task;

            this.calculate_path();
            this.draw();
        }

        calculate_path() {

            if (this.endpoint === undefined) {
                this.endpoint = (this.from_task.$bar.getX() <= this.to_task.$bar.getX()) ? this.from_task.$endpoint_end :
                    this.from_task.$endpoint_start;
                this.endpoint.style.opacity = 1;
                this.endpoint.is_used = true;
            }
            const start_x =
                this.endpoint.getAttribute('cx');

            const start_y =
                this.endpoint.getAttribute('cy');

            const end_x = this.to_task.$bar.getX() - this.gantt.options.padding / 2;
            const end_y =
                this.gantt.options.header_height +
                this.gantt.options.bar_height / 2 +
                (this.gantt.options.padding + this.gantt.options.bar_height) *
                this.to_task.task._index +
                this.gantt.options.padding;

            const from_is_below_to =
                this.from_task.task._index >= this.to_task.task._index;
            const curve = this.gantt.options.arrow_curve;
            const clockwise = from_is_below_to ? 1 : 0;
            const curve_y = from_is_below_to ? -curve : curve;
            const offset = from_is_below_to
                ? end_y + this.gantt.options.arrow_curve
                : end_y - this.gantt.options.arrow_curve;


            const down_1 = this.gantt.options.padding - curve;
            const down_2 =
                this.to_task.$bar.getY() +
                this.to_task.$bar.getHeight() / 2 -
                curve_y;
            const left = this.to_task.$bar.getX() - this.gantt.options.padding;

            if (this.endpoint.getAttribute('class').includes('start')) {
                let h_attr = (this.to_task.$bar.getX() > this.from_task.$bar.getX()) ? `h ${-curve * 2}` : `H ${left}`;
                this.path = `
            M ${start_x} ${start_y}
            ${h_attr}
            a ${curve} ${curve} 0 0 ${clockwise} -${curve} ${curve_y}
            V ${down_2}
            a ${curve} ${curve} 0 0 ${clockwise} ${curve} ${curve_y}
            L ${end_x} ${end_y}
            m -5 -5
            l 5 5
            l -5 5`;
            } else {
                if (this.to_task.$bar.getX() <= this.from_task.$bar.getEndX()) {
                    this.path = `
                M ${start_x} ${start_y}
                v ${down_1}
                a ${curve} ${curve} 0 0 1 -${curve} ${curve}
                H ${left}
                a ${curve} ${curve} 0 0 ${clockwise} -${curve} ${curve_y}
                V ${down_2}
                a ${curve} ${curve} 0 0 ${clockwise} ${curve} ${curve_y}
                L ${end_x} ${end_y}
                m -5 -5
                l 5 5
                l -5 5`;
                } else {
                    if (this.to_task.$bar.getY() !== this.from_task.$bar.getY()) {
                        this.path = `
                    M ${start_x} ${start_y}
                    V ${down_2}
                    a ${curve} ${curve} 0 0 ${clockwise} ${curve} ${curve_y}
                    L ${end_x} ${end_y}
                    m -5 -5
                    l 5 5
                    l -5 5`;
                    } else {
                        this.path = `
                    M ${start_x} ${start_y}
                    L ${end_x} ${end_y}
                    m -5 -5
                    l 5 5
                    l -5 5`;
                    }
                }
            }
        }

        setup_click_event() {
            $.on(this.element, 'click', e => {

                if (e.type === 'click') {
                    this.gantt.trigger_event('dependency_deleted', [this.element]);
                }

                this.element.parentNode.removeChild(this.element);
                if (this.to_task.task.dependencies.length === 0) {
                    this.element.style.opacity = null;
                }
                this.to_task.task.dependencies = this.to_task.task.dependencies.filter(d => d !== this.from_task.task.id);
                this.gantt.arrows = this.gantt.arrows.filter(a => a !== this);
                this.from_task.arrows = this.from_task.arrows.filter(a => a !== this);
                let is_used = false;
                this.from_task.arrows.forEach(a => {
                    if (a.endpoint === this.endpoint)
                        is_used = true;
                });
                this.endpoint.is_used = is_used;
                this.endpoint.style.opacity = is_used ? 1 : null;
                this.to_task.arrows = this.to_task.arrows.filter(a => a !== this);
            });
        }

        draw() {
            this.element = createSVG('path', {
                d: this.path,
                'data-from': this.from_task.task.id,
                'data-to': this.to_task.task.id
            });
            this.setup_click_event();
        }

        update() {
            this.calculate_path();
            this.element.setAttribute('d', this.path);
        }
    }

    class Popup {
        constructor(parent, custom_html) {
            this.parent = parent;
            this.custom_html = custom_html;
            this.make();
        }

        make() {
            this.parent.innerHTML = `
            <div class="title"></div>
            <div class="subtitle"></div>
            <div class="pointer"></div>
        `;

            this.hide();

            this.title = this.parent.querySelector('.title');
            this.subtitle = this.parent.querySelector('.subtitle');
            this.pointer = this.parent.querySelector('.pointer');
        }

        show(options) {
            if (!options.target_element) {
                throw new Error('target_element is required to show popup');
            }
            if (!options.position) {
                options.position = 'left';
            }
            this.options = options;
            const target_element = options.target_element;

            if (this.custom_html) {
                let html = this.custom_html(options.task);
                html += '<div class="pointer"></div>';
                this.parent.innerHTML = html;
                this.pointer = this.parent.querySelector('.pointer');
            } else {
                // set data
                if (typeof options.task.to_show_in_popup === 'string') {
                    this.parent.innerHTML = '<div class="title">'+ options.title +'</div>';
                    let to_show = options.task.to_show_in_popup.split(',');
                    to_show.forEach((item_with_class) => {
                        let class_item = item_with_class.split(':');
                        this.parent.innerHTML += `
                    <div class="` + (class_item[0].length == 0 ? 'subtitle' : class_item[0]) + '">'
                            + (class_item[1].length == 0 ? '' : class_item[1] + ': ') + options.task[class_item[2]] +
                            '</div>';
                    });
                    this.parent.innerHTML += '<div class="pointer"></div>';
                    this.pointer = this.parent.querySelector('.pointer');
                } else {
                    this.make();
                    this.title.innerHTML = options.title;
                    this.subtitle.innerHTML = options.subtitle;
                    this.parent.style.width = this.parent.clientWidth + 'px';
                }
            }

            // set position
            let position_meta;
            if (target_element instanceof HTMLElement) {
                position_meta = target_element.getBoundingClientRect();
            } else if (target_element instanceof SVGElement) {
                position_meta = options.target_element.getBBox();
            }

            if (options.position === 'left') {
                this.parent.style.left =
                    position_meta.x + (position_meta.width + 10) + 'px';
                this.parent.style.top = position_meta.y + 'px';

                this.pointer.style.transform = 'rotateZ(90deg)';
                this.pointer.style.left = '-7px';
                this.pointer.style.top = '2px';
            }

            // show
            this.parent.style.visibility = 'visible';
        }

        hide() {
            this.parent.style.visibility = 'hidden';
        }
    }

    class Swimlane {
        constructor(gantt, swimlane) {
            this.gantt = gantt;
            this.parent = gantt.$svg_swimlanes;
            this.swimlane = swimlane;

            this.set_defaults();
            this.make();
        }

        set_defaults() {
            this.longest_title_width = this.parent.longest_title_width;
            this.longest_sub_title_width = this.parent.longest_sub_title_width;
            this.container_width = this.parent.getBoundingClientRect().width;
            this.padding = this.gantt.options.padding;
            this.swimlanes_map = this.gantt.swimlanes_map;
            this.row_height = this.gantt.row_height;
            this.header_height = this.gantt.header.getBoundingClientRect().height;
        }

        make() {
            this.make_main_cell();
            this.make_sub_cells();
        }

        make_main_cell() {
            this.swimlane_group = createSVG('g', {
                class: 'swimlane',
                id: this.swimlane,
                append_to: this.parent
            });


            this.title = createSVG('text', {
                x: this.padding,
                y: 0,
                innerHTML: this.swimlane,
                class: 'swimlane-label',
                append_to: this.swimlane_group
            });

            this.main_cell = createSVG('rect', {
                x: 0,
                y: 0,
                width: this.container_width,
                height: 0,
                class: 'swimlane-row',
                append_to: this.swimlane_group
            });

            this.swimlane_group.appendChild(this.title);

        }

        make_sub_cells() {
            this.from_row = Number.MAX_SAFE_INTEGER;
            this.to_row = 0;

            for (var sub_swimlane in this.swimlanes_map[this.swimlane]) {

                let row_index = this.swimlanes_map[this.swimlane][sub_swimlane];

                this.from_row = row_index < this.from_row ? row_index : this.from_row;
                this.to_row = row_index > this.to_row ? row_index : this.to_row;

                if (!sub_swimlane.includes('undefined')) {
                    let sub_swimlanes_group = createSVG('g', {
                        class: 'sub-swimlane',
                        id: sub_swimlane,
                        append_to: this.swimlane_group
                    });

                    let y_coord = this.gantt.get_y_coord_of_row(row_index);

                    let sub_title = createSVG('text', {
                        x: 0,
                        y: (row_index === 0 ? this.header_height : y_coord) + 3 * this.row_height / 5,
                        innerHTML: sub_swimlane,
                        class: 'sub-swimlane-label',
                        append_to: sub_swimlanes_group
                    });

                    let finale_x_coord = this.container_width - this.longest_sub_title_width - this.padding;
                    createSVG('rect', {
                        x: finale_x_coord,
                        y: row_index === 0 ? this.header_height : y_coord,
                        width: this.longest_sub_title_width + this.padding,
                        height: this.row_height,
                        class: 'sub-swimlane-row',
                        append_to: sub_swimlanes_group
                    });

                    $.attr(sub_title, 'x', finale_x_coord + this.padding / 2);
                    sub_swimlanes_group.appendChild(sub_title);
                }
            }

            this.update_main_cell_position();
        }

        update_main_cell_position() {
            let y_coord_from = this.gantt.get_y_coord_of_row(this.from_row);

            $.attr(this.title, 'y', (this.from_row === 0 ? this.header_height : y_coord_from)
                + (this.row_height * (this.to_row - this.from_row + 1) / 2) + this.title.getBoundingClientRect().height / 4);
            $.attr(this.main_cell, 'y', (this.from_row === 0 ? this.header_height : y_coord_from));
            $.attr(this.main_cell, 'height', this.row_height * (this.to_row - this.from_row + 1));
        }

        /*
         * is_title == true => returns width of the biggest text svg element with swimlane title
         * is_title == false => returns width of the biggest text svg element with swimlane subtitle
         */
        static get_longest_title_width(gantt, is_title) {

            let max = 0;
            let longest_title;
            gantt.tasks.forEach((task) => {
                if (is_title && task.swimlane !== undefined) {
                    if (task.swimlane.length > max) {
                        max = task.swimlane.length;
                        longest_title = task.swimlane;
                    }
                }
                if (!is_title && task.sub_swimlane !== undefined) {
                    if (task.sub_swimlane.length > max) {
                        max = task.sub_swimlane.length;
                        longest_title = task.sub_swimlane;
                    }
                }
            });

            let swimlane_group = createSVG('g', {
                class: 'swimlane',
                append_to: gantt.$svg_swimlanes
            });

            let title = createSVG('text', {
                x: gantt.options.padding,
                y: 0,
                innerHTML: longest_title,
                class: 'swimlane-label',
                append_to: swimlane_group
            });

            let result = title.getBBox().width;
            gantt.$svg_swimlanes.innerHTML = '';

            return result;
        }
    }

    class Gantt {

        constructor(wrapper, tasks, options) {
            this.setup_wrapper(wrapper);
            this.setup_options(options);
            this.setup_swimlanes(tasks);
            this.setup_tasks(tasks);
            // initialize with default view mode
            this.change_view_mode();
            this.bind_events();
        }

        setup_wrapper(element) {
            let svg_element, wrapper_element;

            // CSS Selector is passed
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }

            // get the SVGElement
            if (element instanceof HTMLElement) {
                wrapper_element = element;
                svg_element = element.querySelector('svg');
            } else if (element instanceof SVGElement) {
                svg_element = element;
            } else {
                throw new TypeError(
                    'Frappé Gantt only supports usage of a string CSS selector,' +
                        " HTML DOM element or SVG DOM element for the 'element' parameter"
                );
            }

            // svg element
            if (!svg_element) {
                // create it
                this.$svg = createSVG('svg', {
                    append_to: wrapper_element,
                    class: 'gantt'
                });
            } else {
                this.$svg = svg_element;
                this.$svg.classList.add('gantt');
            }

            // swimlane wrapper
            this.$swimlanes_container = document.createElement('div');
            this.$swimlanes_container.style.cssFloat = 'left';
            this.$swimlanes_container.classList.add('gantt-swimlanes-container');

            // wrapper element
            this.$container = document.createElement('div');
            this.$container.classList.add('gantt-container');

            const parent_element = this.$svg.parentElement;
            parent_element.appendChild(this.$swimlanes_container);
            parent_element.appendChild(this.$container);
            this.$container.appendChild(this.$svg);

            this.$svg_swimlanes = createSVG('svg', {
                append_to: this.$swimlanes_container,
                class: 'gantt-swimlanes'
            });
            this.$swimlanes_container.appendChild(this.$svg_swimlanes);

            // popup wrapper
            this.popup_wrapper = document.createElement('div');
            this.popup_wrapper.classList.add('popup-wrapper');
            this.$container.appendChild(this.popup_wrapper);
        }

        setup_options(options) {
            const default_options = {
                header_height: 50,
                column_width: 30,
                step: 24,
                view_modes: [
                    'Quarter Day',
                    'Half Day',
                    'Day',
                    'Week',
                    'Month',
                    'Year'
                ],
                bar_height: 20,
                bar_corner_radius: 3,
                arrow_curve: 5,
                padding: 18,
                view_mode: 'Day',
                date_format: 'YYYY-MM-DD',
                popup_trigger: 'click',
                custom_popup_html: null,
                language: 'en'
            };
            this.options = Object.assign({}, default_options, options);
        }

        setup_defaults() {

            this.row_height = this.options.bar_height + this.options.padding;
        
            this.row_width = this.dates.length * this.options.column_width;

            this.table_height = this.options.header_height + this.options.padding / 2 +
                    (this.row_height) * (this.tasks.length == 0 ? 5 : this.indexed_tasks.length + 1);
        
            this.table_width = this.dates.length * this.options.column_width;

        
        }

        setup_tasks(tasks) {
            this.indexed_tasks = [];
            // prepare tasks
            this.tasks = tasks.map((task, i) => {
                // convert to Date objects
                task._start = date_utils.parse(task.start);
                task._end = date_utils.parse(task.end);

                // make task invalid if duration too large
                if (date_utils.diff(task._end, task._start, 'year') > 10) {
                    task.end = null;
                }


                // cache index
                task._index = ((this.swimlanes_map[task.swimlane]) === undefined ? i :
                 (this.swimlanes_map[task.swimlane][task.sub_swimlane] !== undefined ? this.swimlanes_map[task.swimlane][task.sub_swimlane] : i));

                if (!this.indexed_tasks.includes(task._index)) this.indexed_tasks.push(task._index);

                // invalid dates
                if (!task.start && !task.end) {
                    const today = date_utils.today();
                    task._start = today;
                    task._end = date_utils.add(today, 2, 'day');
                }

                if (!task.start && task.end) {
                    task._start = date_utils.add(task._end, -2, 'day');
                }

                if (task.start && !task.end) {
                    task._end = date_utils.add(task._start, 2, 'day');
                }

                // if hours is not set, assume the last day is full day
                // e.g: 2018-09-09 becomes 2018-09-09 23:59:59
                const task_end_values = date_utils.get_date_values(task._end);
                if (task_end_values.slice(3).every(d => d === 0)) {
                    task._end = date_utils.add(task._end, 24, 'hour');
                }

                // invalid flag
                if (!task.start || !task.end) {
                    task.invalid = true;
                }

                // dependencies
                if (typeof task.dependencies === 'string' || !task.dependencies) {
                    let deps = [];
                    if (task.dependencies) {
                        deps = task.dependencies
                            .split(',')
                            .map(d => d.trim())
                            .filter(d => d);
                    }
                    task.dependencies = deps;
                }

                // uids
                if (!task.id) {
                    task.id = generate_id(task);
                }

                return task;
            });
            this.remove_empty_rows();
            this.setup_dependencies();
        }

        setup_dependencies() {
            this.dependency_map = {};
            for (let t of this.tasks) {
                for (let d of t.dependencies) {
                    this.dependency_map[d] = this.dependency_map[d] || [];
                    this.dependency_map[d].push(t.id);
                }
            }
        }

        remove_empty_rows() {
            let rows = [...Array(this.tasks.length).keys()];
            rows = (rows.filter(n => !this.indexed_tasks.includes(n)));
            rows.forEach((i) => {
                this.tasks.forEach((task) => {
                    if (task._index > i) {
                        task._index -= 1;
                    }
                });

                for ( var swimlane in this.swimlanes_map ) {
                    for (var swimlane_line in this.swimlanes_map[swimlane]) {
                        let index = this.swimlanes_map[swimlane][swimlane_line];
                        if (index > i) {
                            this.swimlanes_map[swimlane][swimlane_line] -= 1;
                        }
                    }
                }
            });
        }

        setup_swimlanes(tasks) {
            this.swimlanes_map = {};
            tasks.map((task,i) => {
                if (task.swimlane !== undefined) {
                        this.swimlanes_map[task.swimlane] = this.swimlanes_map[task.swimlane] ||  {}; 
                        if (isNaN(this.swimlanes_map[task.swimlane][task.sub_swimlane])) {
                            if (task.sub_swimlane === undefined) {
                                this.swimlanes_map[task.swimlane]['undefined' + task.id ] = i;
                            } else {
                                this.swimlanes_map[task.swimlane][task.sub_swimlane] = i;
                            }
                        }                                                                   
                }
            });
            console.log(this.swimlanes_map);
        }

        refresh(tasks) {
            this.setup_swimlanes(tasks);
            this.setup_tasks(tasks);
            this.change_view_mode();
        }

        change_view_mode(mode = this.options.view_mode) {
            this.update_view_scale(mode);
            this.setup_dates();
            this.setup_defaults();
            this.render();
            // fire viewmode_change event
            this.trigger_event('view_change', [mode]);
        }

        update_view_scale(view_mode) {
            this.options.view_mode = view_mode;

            if (view_mode === 'Day') {
                this.options.step = 24;
                this.options.column_width = 38;
            } else if (view_mode === 'Half Day') {
                this.options.step = 24 / 2;
                this.options.column_width = 38;
            } else if (view_mode === 'Quarter Day') {
                this.options.step = 24 / 4;
                this.options.column_width = 38;
            } else if (view_mode === 'Week') {
                this.options.step = 24 * 7;
                this.options.column_width = 140;
            } else if (view_mode === 'Month') {
                this.options.step = 24 * 30;
                this.options.column_width = 120;
            } else if (view_mode === 'Year') {
                this.options.step = 24 * 365;
                this.options.column_width = 120;
            }
        }

        setup_dates() {
            this.setup_gantt_dates();
            this.setup_date_values();
        }

        setup_gantt_dates() {
            this.gantt_start = this.gantt_end = null;

            for (let task of this.tasks) {
                // set global start and end date
                if (!this.gantt_start || task._start < this.gantt_start) {
                    this.gantt_start = task._start;
                }
                if (!this.gantt_end || task._end > this.gantt_end) {
                    this.gantt_end = task._end;
                }
            }

            if (this.tasks.length == 0) {
                this.gantt_start = date_utils.now();
                this.gantt_end = date_utils.add(this.gantt_start, 2, "year");
            } else {
                this.gantt_start = date_utils.start_of(this.gantt_start, 'day');
                this.gantt_end = date_utils.start_of(this.gantt_end, 'day');
            }
     
            // add date padding on both sides
            if (this.view_is(['Quarter Day', 'Half Day'])) {
                this.gantt_start = date_utils.add(this.gantt_start, -7, 'day');
                this.gantt_end = date_utils.add(this.gantt_end, 7, 'day');
            } else if (this.view_is('Month')) {
                this.gantt_start = date_utils.start_of(this.gantt_start, 'year');
                this.gantt_end = date_utils.add(this.gantt_end, 1, 'year');
            } else if (this.view_is('Year')) {
                this.gantt_start = date_utils.add(this.gantt_start, -2, 'year');
                this.gantt_end = date_utils.add(this.gantt_end, 2, 'year');
            } else {
                this.gantt_start = date_utils.add(this.gantt_start, -1, 'month');
                this.gantt_end = date_utils.add(this.gantt_end, 1, 'month');
            }
        }

        setup_date_values() {
            this.dates = [];
            let cur_date = null;

            while (cur_date === null || cur_date < this.gantt_end) {
                if (!cur_date) {
                    cur_date = date_utils.clone(this.gantt_start);
                } else {
                    if (this.view_is('Year')) {
                        cur_date = date_utils.add(cur_date, 1, 'year');
                    } else if (this.view_is('Month')) {
                        cur_date = date_utils.add(cur_date, 1, 'month');
                    } else {
                        cur_date = date_utils.add(
                            cur_date,
                            this.options.step,
                            'hour'
                        );
                    }
                }
                this.dates.push(cur_date);
            }
        }

        bind_events() {
            this.bind_grid_click();
            this.bind_bar_events();
        }

        render() {
            this.clear();
            this.setup_layers();
            this.make_grid();
            this.make_dates();
            this.make_bars();
            this.make_arrows();
            this.map_arrows_on_bars();
            this.set_width();
            this.set_scroll_position();
            this.make_swimlanes();
            this.reload_popup();
        }

        setup_layers() {
            this.layers = {};
            const layers = ['grid', 'date', 'bar', 'progress', 'arrow', 'details'];
            // make group layers
            for (let layer of layers) {
                this.layers[layer] = createSVG('g', {
                    class: layer,
                    append_to: this.$svg
                });
            }
        }

        make_grid() {
            this.make_grid_background();
            this.make_grid_rows();
            this.make_grid_header();
            this.make_grid_ticks();
            this.make_grid_highlights();
        }

        make_grid_background() {
            const grid_width = this.table_width;
            const grid_height = this.table_height;

            this.grid_background = createSVG('rect', {
                x: 0,
                y: 0,
                width: grid_width,
                height: grid_height,
                class: 'grid-background',
                append_to: this.layers.grid
            });

            $.attr(this.$svg, {
                height: grid_height + this.options.padding + 100,
                width: '100%'
            });
        }

        make_grid_rows() {
            const rows_layer = createSVG('g', { append_to: this.layers.grid });
            const lines_layer = createSVG('g', { append_to: this.layers.grid });

            const row_width = this.row_width;
            const row_height = this.row_height;

            let row_y = this.options.header_height + this.options.padding / 2;

            for ( var i = 0; i <= (this.tasks.length == 0 ? 5 : this.indexed_tasks.length); i++) {
                createSVG('rect', {
                    x: 0,
                    y: row_y,
                    width: row_width,
                    height: row_height,
                    class: 'grid-row',
                    append_to: rows_layer
                });

                createSVG('line', {
                    x1: 0,
                    y1: row_y + row_height,
                    x2: row_width,
                    y2: row_y + row_height,
                    class: 'row-line',
                    append_to: lines_layer
                });

                row_y += this.options.bar_height + this.options.padding;
            }
        }

        make_grid_header() {
            const header_width = this.row_width;
            const header_height = this.options.header_height + 10;
            this.header = createSVG('rect', {
                x: 0,
                y: 0,
                width: header_width,
                height: header_height,
                class: 'grid-header',
                append_to: this.layers.grid
            });
        }

        make_grid_ticks() {
            let tick_x = 0;
            let tick_y = this.options.header_height + this.options.padding / 2;
            let tick_height = (this.row_height) * this.indexed_tasks.length;

            for (let date of this.dates) {
                let tick_class = 'tick';
                // thick tick for monday
                if (this.view_is('Day') && date.getDate() === 1) {
                    tick_class += ' thick';
                }
                // thick tick for first week
                if (
                    this.view_is('Week') &&
                    date.getDate() >= 1 &&
                    date.getDate() < 8
                ) {
                    tick_class += ' thick';
                }
                // thick ticks for quarters
                if (this.view_is('Month') && (date.getMonth() + 1) % 3 === 0) {
                    tick_class += ' thick';
                }

                createSVG('path', {
                    d: `M ${tick_x} ${tick_y} v ${tick_height}`,
                    class: tick_class,
                    append_to: this.layers.grid
                });

                if (this.view_is('Month')) {
                    tick_x +=
                        date_utils.get_days_in_month(date) *
                        this.options.column_width /
                        30;
                } else {
                    tick_x += this.options.column_width;
                }
            }
        }

        make_grid_highlights() {
            // highlight today's date
            if (this.view_is('Day')) {
                const x =
                    date_utils.diff(date_utils.today(), this.gantt_start, 'hour') /
                    this.options.step *
                    this.options.column_width;
                const y = 0;

                const width = this.options.column_width;
                const height = this.row_height *
                    this.indexed_tasks.length +
                    this.options.header_height +
                    this.options.padding / 2;

                createSVG('rect', {
                    x,
                    y,
                    width,
                    height,
                    class: 'today-highlight',
                    append_to: this.layers.grid
                });
            }
        }

        make_dates() {
            for (let date of this.get_dates_to_draw()) {
                createSVG('text', {
                    x: date.lower_x,
                    y: date.lower_y,
                    innerHTML: date.lower_text,
                    class: 'lower-text',
                    append_to: this.layers.date
                });

                if (date.upper_text) {
                    const $upper_text = createSVG('text', {
                        x: date.upper_x,
                        y: date.upper_y,
                        innerHTML: date.upper_text,
                        class: 'upper-text',
                        append_to: this.layers.date
                    });

                    // remove out-of-bound dates
                    if (
                        $upper_text.getBBox().x2 > this.layers.grid.getBBox().width
                    ) {
                        $upper_text.remove();
                    }
                }
            }
        }

        get_dates_to_draw() {
            let last_date = null;
            const dates = this.dates.map((date, i) => {
                const d = this.get_date_info(date, last_date, i);
                last_date = date;
                return d;
            });
            return dates;
        }

        get_date_info(date, last_date, i) {
            if (!last_date) {
                last_date = date_utils.add(date, 1, 'year');
            }
            const date_text = {
                'Quarter Day_lower': date_utils.format(
                    date,
                    'HH',
                    this.options.language
                ),
                'Half Day_lower': date_utils.format(
                    date,
                    'HH',
                    this.options.language
                ),
                Day_lower:
                    date.getDate() !== last_date.getDate()
                        ? date_utils.format(date, 'D', this.options.language)
                        : '',
                Week_lower:
                    date.getMonth() !== last_date.getMonth()
                        ? date_utils.format(date, 'D MMM', this.options.language)
                        : date_utils.format(date, 'D', this.options.language),
                Month_lower: date_utils.format(date, 'MMMM', this.options.language),
                Year_lower: date_utils.format(date, 'YYYY', this.options.language),
                'Quarter Day_upper':
                    date.getDate() !== last_date.getDate()
                        ? date_utils.format(date, 'D MMM', this.options.language)
                        : '',
                'Half Day_upper':
                    date.getDate() !== last_date.getDate()
                        ? date.getMonth() !== last_date.getMonth()
                          ? date_utils.format(date, 'D MMM', this.options.language)
                          : date_utils.format(date, 'D', this.options.language)
                        : '',
                Day_upper:
                    date.getMonth() !== last_date.getMonth()
                        ? date_utils.format(date, 'MMMM', this.options.language)
                        : '',
                Week_upper:
                    date.getMonth() !== last_date.getMonth()
                        ? date_utils.format(date, 'MMMM', this.options.language)
                        : '',
                Month_upper:
                    date.getFullYear() !== last_date.getFullYear()
                        ? date_utils.format(date, 'YYYY', this.options.language)
                        : '',
                Year_upper:
                    date.getFullYear() !== last_date.getFullYear()
                        ? date_utils.format(date, 'YYYY', this.options.language)
                        : ''
            };

            const base_pos = {
                x: i * this.options.column_width,
                lower_y: this.options.header_height,
                upper_y: this.options.header_height - 25
            };

            const x_pos = {
                'Quarter Day_lower': this.options.column_width * 4 / 2,
                'Quarter Day_upper': 0,
                'Half Day_lower': this.options.column_width * 2 / 2,
                'Half Day_upper': 0,
                Day_lower: this.options.column_width / 2,
                Day_upper: this.options.column_width * 30 / 2,
                Week_lower: 0,
                Week_upper: this.options.column_width * 4 / 2,
                Month_lower: this.options.column_width / 2,
                Month_upper: this.options.column_width * 12 / 2,
                Year_lower: this.options.column_width / 2,
                Year_upper: this.options.column_width * 30 / 2
            };

            return {
                upper_text: date_text[`${this.options.view_mode}_upper`],
                lower_text: date_text[`${this.options.view_mode}_lower`],
                upper_x: base_pos.x + x_pos[`${this.options.view_mode}_upper`],
                upper_y: base_pos.upper_y,
                lower_x: base_pos.x + x_pos[`${this.options.view_mode}_lower`],
                lower_y: base_pos.lower_y
            };
        }

        make_swimlanes() {
            if (this.tasks.length == 0) {
                return;
            }
            
            this.$svg_swimlanes.longest_title_width = Swimlane.get_longest_title_width(this,true);
            this.$svg_swimlanes.longest_sub_title_width = Swimlane.get_longest_title_width(this,false);
            const finale_container_width = this.$svg_swimlanes.longest_title_width + this.$svg_swimlanes.longest_sub_title_width
                + 3 * this.options.padding;

            $.attr(this.$svg_swimlanes, 'height', this.table_height + 1);
            $.attr(this.$svg_swimlanes, 'width', finale_container_width);
            
            createSVG('rect', {
                x: 0,
                y: this.header.getBoundingClientRect().height,
                width: finale_container_width,
                height: this.table_height - this.header.getBoundingClientRect().height,
                class: 'swimlanes-background',
                append_to: this.$svg_swimlanes
            });

            createSVG('rect', {
                x: 0,
                y: 0,
                width: finale_container_width,
                height: this.header.getBoundingClientRect().height,
                class: 'swimlanes-header',
                append_to: this.$svg_swimlanes
            });

            for (var swimlane in this.swimlanes_map) {
                new Swimlane(this, swimlane);
            }

            createSVG('line', {
                x1: 0,
                y1: this.get_y_coord_of_row(this.indexed_tasks[this.indexed_tasks.length - 1 ]) + this.row_height,
                x2: this.row_width,
                y2: this.get_y_coord_of_row(this.indexed_tasks[this.indexed_tasks.length - 1]) + this.row_height,
                class: 'separator',
                append_to: this.$svg_swimlanes
            });

            createSVG('line', {
                x1: finale_container_width,
                y1: 0,
                x2: finale_container_width,
                y2: this.table_height,
                class: 'separator',
                append_to: this.$svg_swimlanes
            });
        }

        make_bars() {
            this.bars = this.tasks.map(task => {
                const bar = new Bar(this, task);
                if (this.popup && task == this.popup.options.task) this.popups_bar = bar;
                if (this.popup && this.popup.parent.style.visibility == 'hidden') this.popups_bar = null;
                this.layers.bar.appendChild(bar.group);
                return bar;
            });
        }

        reload_popup() {
            if (this.popups_bar) this.popups_bar.show_popup();
        }

        make_arrows() {
            this.arrows = [];
            for (let task of this.tasks) {
                let arrows = [];
                arrows = task.dependencies
                    .map(task_id => {
                        const dependency = this.get_task(task_id);
                        if (!dependency) return;
                        const arrow = new Arrow(
                            this,
                            this.get_bar(dependency.id), // from_task
                            this.get_bar(task.id) // to_task
                        );
                        this.layers.arrow.appendChild(arrow.element);
                        return arrow;
                    })
                    .filter(Boolean); // filter falsy values
                this.arrows = this.arrows.concat(arrows);
            }
        }

        map_arrows_on_bars() {
            for (let bar of this.bars) {
                bar.arrows = this.arrows.filter(arrow => {
                    return (
                        arrow.from_task.task.id === bar.task.id ||
                        arrow.to_task.task.id === bar.task.id
                    );
                });
            }
        }

        set_width() {
            const cur_width = this.$svg.getBoundingClientRect().width;
            const actual_width = this.$svg
                .querySelector('.grid .grid-row')
                .getAttribute('width');
            if (cur_width < actual_width) {
                this.$svg.setAttribute('width', actual_width);
            }
        }

        set_scroll_position() {
            const parent_element = this.$svg.parentElement;
            if (!parent_element) return;

            const hours_before_first_task = this.tasks.length == 0 ? this.gantt_start : date_utils.diff(
                this.get_oldest_starting_date(),
                this.gantt_start,
                'hour'
            );

            const scroll_pos =
                hours_before_first_task /
                    this.options.step *
                    this.options.column_width -
                this.options.column_width;

            parent_element.scrollLeft = scroll_pos;
        }

        bind_grid_click() {
            $.on(
                this.$svg,
                this.options.popup_trigger,
                '.grid-row, .grid-header',
                () => {
                    this.unselect_all();
                    this.hide_popup();
                }
            );
        }

        bind_bar_events() {
            let is_dragging = false;
            let x_on_start = 0;
            let y_on_start = 0;
            let is_resizing_left = false;
            let is_resizing_right = false;
            let parent_bar_id = null;
            let bars = []; // instanceof Bar
            this.bar_being_dragged = null;

            function action_in_progress() {
                return is_dragging || is_resizing_left || is_resizing_right;
            }

            $.on(this.$svg, 'mousedown', '.bar-wrapper, .handle', (e, element) => {
                const bar_wrapper = $.closest('.bar-wrapper', element);

                if (element.classList.contains('left')) {
                    is_resizing_left = true;
                } else if (element.classList.contains('right')) {
                    is_resizing_right = true;
                } else if (element.classList.contains('bar-wrapper')) {
                    is_dragging = true;
                }

                bar_wrapper.classList.add('active');

                x_on_start = e.offsetX;
                y_on_start = e.offsetY;

                parent_bar_id = bar_wrapper.getAttribute('data-id');
                const ids = [
                    parent_bar_id,
                    ...this.get_all_dependent_tasks(parent_bar_id)
                ];
                bars = ids.map(id => this.get_bar(id));

                this.bar_being_dragged = parent_bar_id;

                bars.forEach(bar => {
                    if (bar.task.editable != false) {
                        const $bar = bar.$bar;
                        $bar.ox = $bar.getX();
                        $bar.oy = $bar.getY();
                        $bar.owidth = $bar.getWidth();
                        $bar.finaldx = 0;
                    }
                });
            });

            $.on(this.$svg, 'mousemove', e => {
                if (!action_in_progress()) return;
                const dx = e.offsetX - x_on_start;
                const dy = e.offsetY - y_on_start;

                bars.forEach(bar => {
                    const $bar = bar.$bar;
                    $bar.finaldx = this.get_snap_position(dx);

                    let start_drag = (bar.task.start_drag !== undefined) ? bar.task.start_drag : true;
                    let end_drag = (bar.task.end_drag !== undefined) ? bar.task.end_drag : true;     

                    if (is_resizing_left) {
                        if (parent_bar_id === bar.task.id) {
                            if (start_drag && end_drag || 
                                (!end_drag && $bar.ox + $bar.finaldx < $bar.ox + $bar.owidth)) {
                                bar.update_bar_position({
                                x: $bar.ox + $bar.finaldx,
                                    width: $bar.owidth - $bar.finaldx
                                });
                            }
                        } else if (start_drag && end_drag) {  
                                bar.update_bar_position({
                                x: $bar.ox + $bar.finaldx
                                });
                            }
                    } else if (is_resizing_right) {
                        if (parent_bar_id === bar.task.id) {           
                            if (end_drag && $bar.owidth + $bar.finaldx > 0) {
                                bar.update_bar_position({
                                width: $bar.owidth + $bar.finaldx
                                });
                                //update popup position
                                let position_meta = $bar.getBBox();
                                position_meta = position_meta.x + (position_meta.width + 10) + 'px';
                
                                this.popup_wrapper.style.left = position_meta;
                            }
                        }
                    } else if (is_dragging) {
                        if (start_drag && end_drag) {
                                bar.update_bar_position({ x: $bar.ox + $bar.finaldx });
                        }
                    }
                });
            });

            document.addEventListener('mouseup', e => {
                if (is_dragging || is_resizing_left || is_resizing_right) {
                    bars.forEach(bar => bar.group.classList.remove('active'));
                }

                is_dragging = false;
                is_resizing_left = false;
                is_resizing_right = false;
            });

            $.on(this.$svg, 'mouseup', e => {
                this.bar_being_dragged = null;
                bars.forEach(bar => {
                    const $bar = bar.$bar;
                    if (!$bar.finaldx) return;
                    bar.date_changed();
                    bar.set_action_completed();
                });
            });

            this.bind_bar_progress();
            this.bind_endpoints();
        }

        bind_bar_progress() {
            let x_on_start = 0;
            let y_on_start = 0;
            let is_resizing = null;
            let bar = null;
            let $bar_progress = null;
            let $bar_progress_inner = null;
            let $bar = null;

            $.on(this.$svg, 'mousedown', '.handle.progress', (e, handle) => {
                is_resizing = true;
                x_on_start = e.offsetX;
                y_on_start = e.offsetY;

                const $bar_wrapper = $.closest('.bar-wrapper', handle);
                const id = $bar_wrapper.getAttribute('data-id');
                bar = this.get_bar(id);
                
                $bar_progress = bar.$bar_progress;
                $bar_progress_inner = bar.$bar_progress_inner;
                $bar = bar.$bar;

                $bar_progress.finaldx = 0;
                $bar_progress.owidth = $bar_progress.getWidth();
                $bar_progress.min_dx = -$bar_progress.getWidth();
            });

            $.on(this.$svg, 'mousemove', e => {
                if (!is_resizing) return;
                let dx = e.offsetX - x_on_start;
                let dy = e.offsetY - y_on_start;

                if (dx < $bar_progress.min_dx) {
                    dx = $bar_progress.min_dx;
                }

                const $handle = bar.$handle_progress;

                const finale_width = $bar_progress.owidth + dx;
                $.attr($bar_progress, 'width', finale_width);
                if (finale_width <= $bar.getWidth()) {
                    $.attr($bar_progress_inner, 'width', finale_width);
                } else {
                    $.attr($bar_progress_inner, 'width', $bar.getWidth());
                }

                $.attr($handle, 'points', bar.get_progress_polygon_points());
                $bar_progress.finaldx = dx;
            });

            $.on(this.$svg, 'mouseup', () => {
                if (is_resizing) {
                    is_resizing = false;
                    if (!($bar_progress && $bar_progress.finaldx)) return;
                    bar.progress_changed();
                    bar.set_action_completed();
                }
            });
        }

        bind_endpoints() {
            let from_bar = null;
            let to_bar = null;

            $.on(this.$svg,'click','.endpoint', (e, element) => {
                const bar_wrapper = $.closest('.bar-wrapper', element);
                
                if (element.classList.contains('start')) {
                    return;
                }

                if (from_bar == null) {
                    from_bar = this.get_bar(bar_wrapper.getAttribute('data-id'));
                    this.bars.forEach( (b) => {
                        if (from_bar != b && !b.task.dependencies.includes(from_bar.task.id)) {
                            b.$endpoint_end.classList.add('endpoint-active');
                        }
                    });
                } else {
                    to_bar = this.get_bar(bar_wrapper.getAttribute('data-id'));
                    
                    if (from_bar != to_bar && to_bar.$endpoint_end.classList.contains('endpoint-active')) {
                        to_bar.task.dependencies.push(from_bar.task.id);
                    
                        const arrow = new Arrow(
                            this,
                            from_bar,
                            to_bar
                        );
                        this.layers.arrow.appendChild(arrow.element);

                        this.arrows.push(arrow);
                        from_bar.arrows.push(arrow);
                        to_bar.arrows.push(arrow);
                        this.trigger_event('dependency_added', [from_bar.task.id]);
                    }

                    [from_bar, to_bar] = this.reset_endpoints();
                }
            });

            $.on(
                this.$svg,
                'click',
                '.grid-row, .grid-header, .bar-group, .handle-group',
                () => {
                    [from_bar, to_bar] = this.reset_endpoints();
                }
            );
            
        }

        reset_endpoints() {
            this.bars.forEach((b) => {
                b.$endpoint_end.classList.remove('endpoint-active');
                if (!b.$endpoint_end.is_used) {
                    b.$endpoint_end.style.opacity = null;
                }

                b.$endpoint_end.style.visibility = null;
            });

            return [null,null];
        }

        get_all_dependent_tasks(task_id) {
            let out = [];
            let to_process = [task_id];
            while (to_process.length) {
                const deps = to_process.reduce((acc, curr) => {
                    acc = acc.concat(this.dependency_map[curr]);
                    return acc;
                }, []);

                out = out.concat(deps);
                to_process = deps.filter(d => !to_process.includes(d));
            }

            return out.filter(Boolean);
        }

        get_snap_position(dx) {
            let odx = dx,
                rem,
                position;

            if (this.view_is('Week')) {
                rem = dx % (this.options.column_width / 7);
                position =
                    odx -
                    rem +
                    (rem < this.options.column_width / 14
                        ? 0
                        : this.options.column_width / 7);
            } else if (this.view_is('Month')) {
                rem = dx % (this.options.column_width / 30);
                position =
                    odx -
                    rem +
                    (rem < this.options.column_width / 60
                        ? 0
                        : this.options.column_width / 30);
            } else {
                rem = dx % this.options.column_width;
                position =
                    odx -
                    rem +
                    (rem < this.options.column_width / 2
                        ? 0
                        : this.options.column_width);
            }
            return position;
        }

        unselect_all() {
            [...this.$svg.querySelectorAll('.bar-wrapper')].forEach(el => {
                el.classList.remove('active');
            });
        }

        view_is(modes) {
            if (typeof modes === 'string') {
                return this.options.view_mode === modes;
            }

            if (Array.isArray(modes)) {
                return modes.some(mode => this.options.view_mode === mode);
            }

            return false;
        }

        get_task(id) {
            return this.tasks.find(task => {
                return task.id === id;
            });
        }

        get_bar(id) {
            return this.bars.find(bar => {
                return bar.task.id === id;
            });
        }

        get_y_coord_of_row(row) {
            return this.options.header_height + this.options.padding / 2 +
                this.row_height * row;
        }

        show_popup(options) {
            if (!this.popup) {
                this.popup = new Popup(
                    this.popup_wrapper,
                    this.options.custom_popup_html
                );
            }
            this.popup.show(options);
        }

        hide_popup() {
            this.popup && this.popup.hide();
        }

        trigger_event(event, args) {
            if (this.options['on_' + event]) {
                this.options['on_' + event].apply(null, args);
            }
        }

        /**
         * Gets the oldest starting date from the list of tasks
         *
         * @returns Date
         * @memberof Gantt
         */
        get_oldest_starting_date() {
            return this.tasks
                .map(task => task._start)
                .reduce(
                    (prev_date, cur_date) =>
                        cur_date <= prev_date ? cur_date : prev_date
                );
        }

        /**
         * Clear all elements from the parent svg element
         *
         * @memberof Gantt
         */
        clear() {
            this.$svg.innerHTML = '';
            this.$svg_swimlanes.innerHTML = '';
        }
    }

    function generate_id(task) {
        return (
            task.name +
            '_' +
            Math.random()
                .toString(36)
                .slice(2, 12)
        );
    }

    return Gantt;

}());
