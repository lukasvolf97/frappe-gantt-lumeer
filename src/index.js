import date_utils from './date_utils';
import { $, createSVG } from './svg_utils';
import Bar from './bar';
import Arrow from './arrow';
import Popup from './popup';
import Swimlane from './swimlane';

import './gantt.scss';

export default class Gantt {

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
        })
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
        this.indexed_tasks = []
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
            task._index = (task.swimlane === undefined ? this.swimlanes_map[task.id] :
                (task.sub_swimlane !== undefined ? this.swimlanes_map[task.swimlane][task.sub_swimlane] :
                    this.swimlanes_map[task.swimlane]['undefined' + task.id]));

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

            for (var swimlane in this.swimlanes_map) {
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
        let index = 0;
        tasks.map((task) => {
            if (task.swimlane !== undefined && task.used !== true) {
                tasks.map((other_task) => {
                    if (task.swimlane === other_task.swimlane) {
                        this.swimlanes_map[other_task.swimlane] = this.swimlanes_map[other_task.swimlane] || {};
                        if (isNaN(this.swimlanes_map[other_task.swimlane][other_task.sub_swimlane])) {
                            if (other_task.sub_swimlane === undefined) {
                                this.swimlanes_map[other_task.swimlane]['undefined' + other_task.id] = index;
                            } else {
                                this.swimlanes_map[other_task.swimlane][other_task.sub_swimlane] = index;
                            }
                            index += 1
                            other_task.used = true;
                        }
                    }
                })
            }
        });
        //sent tasks with undefined swimlanes to the end of table
        tasks.map((task) => {
            if (task.swimlane === undefined) {
                let swimlane_name = new String(task.id);
                swimlane_name.invalid = true;
                this.swimlanes_map[swimlane_name] = {};
                this.swimlanes_map[swimlane_name] = index
                index += 1
            }
        });
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

        for (var i = 0; i <= (this.tasks.length == 0 ? 5 : this.indexed_tasks.length); i++) {
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

        this.$svg_swimlanes.longest_title_width = Swimlane.get_longest_title_width(this, true);
        this.$svg_swimlanes.longest_sub_title_width = Swimlane.get_longest_title_width(this, false);
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
            if (swimlane.invalid !== true) new Swimlane(this, swimlane);
        }

        createSVG('line', {
            x1: 0,
            y1: this.get_y_coord_of_row(this.indexed_tasks[this.indexed_tasks.length - 1]) + this.row_height,
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

                let start_drag = (bar.task.start_drag !== undefined) ? bar.task.start_drag : true
                let end_drag = (bar.task.end_drag !== undefined) ? bar.task.end_drag : true

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

        $.on(this.$svg, 'click', '.endpoint', (e, element) => {
            const bar_wrapper = $.closest('.bar-wrapper', element);

            if (element.classList.contains('start')) {
                return;
            }

            if (from_bar == null) {
                from_bar = this.get_bar(bar_wrapper.getAttribute('data-id'));
                this.bars.forEach((b) => {
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
            b.$endpoint_end.classList.remove('endpoint-active')
            if (!b.$endpoint_end.is_used) {
                b.$endpoint_end.style.opacity = null;
            }

            b.$endpoint_end.style.visibility = null;
        });

        return [null, null];
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
