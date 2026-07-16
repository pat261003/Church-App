export const ATTENDANCE_GROUPS = [
  'Adult Male',
  'Adult Female',
  'Male Youth',
  'Female Youth',
  'Male Child',
  'Female Child',
];

export const ATTENDANCE_PRINT_GROUPS = [
  { value: 'all', label: 'All Attendees' },
  { value: 'adults', label: 'Adults Only' },
  { value: 'youth', label: 'Youth Only' },
  { value: 'kids', label: 'Kids Only' },
] as const;

export type AttendancePrintGroup = typeof ATTENDANCE_PRINT_GROUPS[number]['value'];

export type AttendanceLike = {
  ministry_group?: string | null;
};

export function normalizeAttendanceGroup(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

export function isAdultGroup(value?: string | null) {
  const group = normalizeAttendanceGroup(value);

  return (
    group === 'male' ||
    group === 'female' ||
    group === 'adult male' ||
    group === 'adult female'
  );
}

export function isYouthGroup(value?: string | null) {
  const group = normalizeAttendanceGroup(value);

  return group === 'male youth' || group === 'female youth';
}

export function isChildGroup(value?: string | null) {
  const group = normalizeAttendanceGroup(value);

  return group === 'male child' || group === 'female child';
}

export function isMaleGroup(value?: string | null) {
  const group = normalizeAttendanceGroup(value);

  return (
    group === 'male' ||
    group === 'adult male' ||
    group === 'male youth' ||
    group === 'male child'
  );
}

export function isFemaleGroup(value?: string | null) {
  const group = normalizeAttendanceGroup(value);

  return (
    group === 'female' ||
    group === 'adult female' ||
    group === 'female youth' ||
    group === 'female child'
  );
}

export function getAttendancePrintGroupLabel(group: AttendancePrintGroup) {
  return ATTENDANCE_PRINT_GROUPS.find(item => item.value === group)?.label || 'All Attendees';
}

export function normalizeAttendancePrintGroup(value?: string | null): AttendancePrintGroup {
  const group = String(value || '').trim().toLowerCase();

  if (group === 'adults' || group === 'youth' || group === 'kids') {
    return group;
  }

  return 'all';
}

export function filterAttendanceByPrintGroup<T extends AttendanceLike>(
  records: T[],
  group: AttendancePrintGroup
) {
  if (group === 'adults') {
    return records.filter(record => isAdultGroup(record.ministry_group));
  }

  if (group === 'youth') {
    return records.filter(record => isYouthGroup(record.ministry_group));
  }

  if (group === 'kids') {
    return records.filter(record => isChildGroup(record.ministry_group));
  }

  return records;
}

export function getAttendanceGroupCounts(records: AttendanceLike[]) {
  const adultMale = records.filter(r => {
    const group = normalizeAttendanceGroup(r.ministry_group);
    return group === 'male' || group === 'adult male';
  }).length;

  const adultFemale = records.filter(r => {
    const group = normalizeAttendanceGroup(r.ministry_group);
    return group === 'female' || group === 'adult female';
  }).length;

  const maleYouth = records.filter(
    r => normalizeAttendanceGroup(r.ministry_group) === 'male youth'
  ).length;

  const femaleYouth = records.filter(
    r => normalizeAttendanceGroup(r.ministry_group) === 'female youth'
  ).length;

  const maleChild = records.filter(
    r => normalizeAttendanceGroup(r.ministry_group) === 'male child'
  ).length;

  const femaleChild = records.filter(
    r => normalizeAttendanceGroup(r.ministry_group) === 'female child'
  ).length;

  const male = records.filter(r => isMaleGroup(r.ministry_group)).length;
  const female = records.filter(r => isFemaleGroup(r.ministry_group)).length;

  return {
    total: records.length,

    male,
    female,

    adultMale,
    adultFemale,
    adultTotal: adultMale + adultFemale,

    maleYouth,
    femaleYouth,
    youthTotal: maleYouth + femaleYouth,

    maleChild,
    femaleChild,
    childrenTotal: maleChild + femaleChild,
  };
}