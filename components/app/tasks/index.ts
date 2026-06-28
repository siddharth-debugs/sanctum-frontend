/**
 * Shared task ATOM components (spec §4.2 / §6). Pure, reusable, token-driven
 * primitives consumed identically by the task detail sheet, the Board / List /
 * Table views, the toolbar and quick-add — this barrel is the single import
 * surface for Phase 3.
 */
export { PriorityIcon, type PriorityIconProps } from "./priority-icon";
export { PrioritySelect, type PrioritySelectProps } from "./priority-select";
export { StatusBadge, type StatusBadgeProps } from "./status-badge";
export { StatusSelect, type StatusSelectProps } from "./status-select";
export { LabelChip, type LabelChipProps } from "./label-chip";
export {
  LabelMultiSelect,
  type LabelMultiSelectProps,
} from "./label-multi-select";
export { AssigneeAvatar, type AssigneeAvatarProps } from "./assignee-avatar";
export {
  AssigneeStack,
  taskAssigneePeople,
  type AssigneeStackProps,
  type AssigneeStackPerson,
} from "./assignee-stack";
export { DueChip, type DueChipProps } from "./due-chip";
export { EstimateInput, type EstimateInputProps } from "./estimate-input";
export {
  ViewSwitcher,
  TASK_VIEWS,
  type ViewSwitcherProps,
  type TaskView,
} from "./view-switcher";
export {
  TaskPickerPopover,
  type TaskPickerPopoverProps,
} from "./task-picker-popover";
