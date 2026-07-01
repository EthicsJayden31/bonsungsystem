import type { CurrentUser, Role } from "@/lib/auth-shared";
import type { Version3PermissionKey, Version3Permissions } from "@/lib/version3-server-contract";

export type AccessUser = Pick<CurrentUser, "role"> & {
  id?: string;
  linkedStudentId?: string;
  permissions?: Version3Permissions | Record<string, boolean>;
};

const areaPermissions: Record<string, Version3PermissionKey | Version3PermissionKey[] | null> = {
  dashboard: null,
  notices: null,
  consultations: null,
  "profile-settings": null,
  accounts: "viewAccounts",
  students: "viewStudents",
  guardians: "viewStudents",
  teachers: "viewTeam",
  enrollments: "manageOperations",
  lessons: null,
  attendance: "viewLessonLogs",
  "lesson-notes": "viewLessonLogs",
  "practice-rooms": "viewReservations",
  payments: "viewPayments",
  tasks: "manageOperations",
  "data-quality": "manageOperations"
};

const defaultPermissionsByRole: Record<Role, Version3Permissions> = {
  owner: {
    manageAccounts: true,
    viewAccounts: true,
    manageOperations: true,
    manageNotices: true,
    managePermissions: true,
    manageMeetings: true,
    manageCalendar: true,
    viewPayments: true,
    clockWork: true,
    viewStudents: true,
    manageStudents: true,
    viewLessonLogs: true,
    writeLessonLogs: true,
    viewReservations: true,
    manageReservations: true,
    reserveLessonRoom: true,
    reservePracticeRoom: true,
    viewTeam: true,
    viewMeetings: true,
    viewCalendar: true,
    reviewAccountRequests: true,
    managePublicSettings: true
  },
  manager: {
    manageAccounts: false,
    viewAccounts: true,
    manageOperations: true,
    manageNotices: true,
    managePermissions: false,
    manageMeetings: true,
    manageCalendar: true,
    viewPayments: true,
    clockWork: true,
    viewStudents: true,
    manageStudents: true,
    viewLessonLogs: true,
    writeLessonLogs: true,
    viewReservations: true,
    manageReservations: true,
    reserveLessonRoom: true,
    reservePracticeRoom: true,
    viewTeam: true,
    viewMeetings: true,
    viewCalendar: true,
    reviewAccountRequests: false,
    managePublicSettings: false
  },
  teacher: {
    manageAccounts: false,
    viewAccounts: false,
    manageOperations: false,
    manageNotices: false,
    managePermissions: false,
    manageMeetings: false,
    manageCalendar: false,
    viewPayments: false,
    clockWork: true,
    viewStudents: true,
    manageStudents: false,
    viewLessonLogs: true,
    writeLessonLogs: true,
    viewReservations: true,
    manageReservations: false,
    reserveLessonRoom: true,
    reservePracticeRoom: true,
    viewTeam: true,
    viewMeetings: true,
    viewCalendar: true,
    reviewAccountRequests: false,
    managePublicSettings: false
  },
  student: {
    manageAccounts: false,
    viewAccounts: false,
    manageOperations: false,
    manageNotices: false,
    managePermissions: false,
    manageMeetings: false,
    manageCalendar: false,
    viewPayments: true,
    clockWork: false,
    viewStudents: false,
    manageStudents: false,
    viewLessonLogs: true,
    writeLessonLogs: false,
    viewReservations: true,
    manageReservations: false,
    reserveLessonRoom: false,
    reservePracticeRoom: true,
    viewTeam: false,
    viewMeetings: false,
    viewCalendar: true,
    reviewAccountRequests: false,
    managePublicSettings: false
  }
};

const roleOnlyAreas: Record<Role, string[]> = {
  owner: [],
  manager: [],
  teacher: ["students", "lessons", "attendance", "lesson-notes", "practice-rooms", "notices", "consultations", "profile-settings"],
  student: ["dashboard", "lessons", "lesson-notes", "practice-rooms", "notices", "consultations", "payments", "profile-settings"]
};

export function permissionsFor(user: AccessUser | Role): Version3Permissions {
  const role = typeof user === "string" ? user : user.role;
  if (role === "owner") return { ...defaultPermissionsByRole.owner };
  return {
    ...defaultPermissionsByRole[role],
    ...(typeof user === "string" ? {} : normalizePermissionOverrides(user.permissions))
  };
}

export function hasVersion3Permission(user: AccessUser | Role | null, key: Version3PermissionKey) {
  if (!user) return false;
  const role = typeof user === "string" ? user : user.role;
  if (role === "owner") return true;
  return Boolean(permissionsFor(user)[key]);
}

export function canAccessVersion3Area(user: AccessUser | Role | null, area: string) {
  if (!user) return false;
  const role = typeof user === "string" ? user : user.role;
  if (role === "owner") return true;

  const requirement = areaPermissions[area];
  if (requirement === null) return true;
  if (requirement === undefined) return roleOnlyAreas[role]?.includes(area) ?? false;
  const requiredPermissions = Array.isArray(requirement) ? requirement : [requirement];
  return requiredPermissions.some((key) => hasVersion3Permission(user, key));
}

function normalizePermissionOverrides(value: unknown): Version3Permissions {
  if (!value || typeof value !== "object") return {};
  return Object.entries(value as Record<string, unknown>).reduce<Version3Permissions>((result, [key, permissionValue]) => {
    if (typeof permissionValue === "boolean") {
      result[key as Version3PermissionKey] = permissionValue;
    }
    return result;
  }, {});
}
