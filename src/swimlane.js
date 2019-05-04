import { $, createSVG } from './svg_utils';

export default class Swimlane {
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

            let row_index = this.swimlanes_map[this.swimlane][sub_swimlane]

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
        $.attr(this.main_cell, 'height', this.row_height * Math.abs(this.to_row - this.from_row + 1));
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