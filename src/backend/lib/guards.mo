import AccessControl "mo:caffeineai-authorization/access-control";
import UserApproval "mo:caffeineai-user-approval/approval";
import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // Max characters per stored data record (stats chunk / snapshot part).
  public let maxDataChars = 1_500_000;
  // Soft byte budget for one paged query response.
  public let pageBudgetChars = 1_800_000;

  // True when caller is approved or admin (may create/modify saved data).
  // Reads the role map directly: AccessControl.isAdmin traps for unregistered callers.
  public func isMember(
    accessControlState : AccessControl.AccessControlState,
    approvalState : UserApproval.UserApprovalState,
    caller : Principal,
  ) : Bool {
    if (caller.isAnonymous()) { return false };
    UserApproval.isApproved(approvalState, caller) or accessControlState.userRoles.get(caller) == ?#admin;
  };
};
