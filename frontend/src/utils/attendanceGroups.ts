export const ATTENDANCE_GROUPS = [
  'Adult Male',
  'Adult Female',
  'Male Youth',
  'Female Youth',
  'Male Child',
  'Female Child',
];

export type AttendanceLike = {
  ministry_group?: string | null;
};

export function normalizeAttendanceGroup(value?: string | null) {
  return String(value || '').trim().toLowerCase();
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