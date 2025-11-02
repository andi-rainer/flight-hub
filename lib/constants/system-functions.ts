/**
 * System Functions
 *
 * These are hardcoded functions that the application logic depends on.
 * They cannot be deleted and their codes cannot be changed.
 * Board members can rename them or toggle active status.
 */

export const SYSTEM_FUNCTIONS = {
  // Aviation
  PILOT: 'pilot',
  FLIGHT_INSTRUCTOR: 'flight_instructor',
  CHIEF_PILOT: 'chief_pilot',

  // Skydiving
  TANDEM_MASTER: 'tandem_master',
  SKYDIVE_INSTRUCTOR: 'skydive_instructor',
  SPORT_JUMPER: 'sport_jumper',

  // Operations
  MANIFEST_COORDINATOR: 'manifest_coordinator',

  // Administration
  TREASURER: 'treasurer',
  CHAIRMAN: 'chairman',
  SECRETARY: 'secretary',
} as const

export type SystemFunction = typeof SYSTEM_FUNCTIONS[keyof typeof SYSTEM_FUNCTIONS]

/**
 * Function Categories
 */
export const FUNCTION_CATEGORIES = {
  AVIATION: 'aviation',
  SKYDIVING: 'skydiving',
  OPERATIONS: 'operations',
  ADMINISTRATION: 'administration',
} as const

export type FunctionCategory = typeof FUNCTION_CATEGORIES[keyof typeof FUNCTION_CATEGORIES]

/**
 * Context types for PersonSelector
 */
export const PERSON_SELECTOR_CONTEXTS = {
  FLIGHT_CREW: 'flight_crew',
  PILOT_IN_COMMAND: 'pilot_in_command',
  COPILOT: 'copilot',
  TANDEM_MASTER: 'tandem_master',
  TANDEM_GUEST: 'tandem_guest',
  SPORT_JUMPER: 'sport_jumper',
  SKYDIVE_INSTRUCTOR: 'skydive_instructor',
  MANIFEST_COORDINATOR: 'manifest_coordinator',
} as const

export type PersonSelectorContext = typeof PERSON_SELECTOR_CONTEXTS[keyof typeof PERSON_SELECTOR_CONTEXTS]

/**
 * Get function codes for a given context
 */
export function getContextFunctionCodes(context: PersonSelectorContext): SystemFunction[] {
  switch (context) {
    case PERSON_SELECTOR_CONTEXTS.FLIGHT_CREW:
    case PERSON_SELECTOR_CONTEXTS.PILOT_IN_COMMAND:
    case PERSON_SELECTOR_CONTEXTS.COPILOT:
      return [SYSTEM_FUNCTIONS.PILOT, SYSTEM_FUNCTIONS.FLIGHT_INSTRUCTOR]

    case PERSON_SELECTOR_CONTEXTS.TANDEM_MASTER:
      return [SYSTEM_FUNCTIONS.TANDEM_MASTER]

    case PERSON_SELECTOR_CONTEXTS.SPORT_JUMPER:
      return [SYSTEM_FUNCTIONS.SPORT_JUMPER]

    case PERSON_SELECTOR_CONTEXTS.SKYDIVE_INSTRUCTOR:
      return [SYSTEM_FUNCTIONS.SKYDIVE_INSTRUCTOR]

    case PERSON_SELECTOR_CONTEXTS.MANIFEST_COORDINATOR:
      return [SYSTEM_FUNCTIONS.MANIFEST_COORDINATOR]

    case PERSON_SELECTOR_CONTEXTS.TANDEM_GUEST:
      return [] // No function required for guests

    default:
      return []
  }
}

/**
 * Get display label for context
 */
export function getContextLabel(context: PersonSelectorContext): string {
  switch (context) {
    case PERSON_SELECTOR_CONTEXTS.FLIGHT_CREW:
      return 'Crew Member'
    case PERSON_SELECTOR_CONTEXTS.PILOT_IN_COMMAND:
      return 'Pilot in Command'
    case PERSON_SELECTOR_CONTEXTS.COPILOT:
      return 'Co-Pilot / Instructor'
    case PERSON_SELECTOR_CONTEXTS.TANDEM_MASTER:
      return 'Tandem Master'
    case PERSON_SELECTOR_CONTEXTS.TANDEM_GUEST:
      return 'Tandem Guest'
    case PERSON_SELECTOR_CONTEXTS.SPORT_JUMPER:
      return 'Sport Jumper'
    case PERSON_SELECTOR_CONTEXTS.SKYDIVE_INSTRUCTOR:
      return 'Skydive Instructor'
    case PERSON_SELECTOR_CONTEXTS.MANIFEST_COORDINATOR:
      return 'Manifest Coordinator'
    default:
      return 'Person'
  }
}

/**
 * Check if a user has any of the specified functions
 */
export function hasAnyFunction(
  userFunctions: string[] | undefined,
  requiredFunctions: SystemFunction[]
): boolean {
  if (!userFunctions || userFunctions.length === 0) return false
  if (requiredFunctions.length === 0) return true

  return requiredFunctions.some(func => userFunctions.includes(func))
}

/**
 * Check if a user has a specific function
 */
export function hasFunction(
  userFunctions: string[] | undefined,
  functionCode: SystemFunction
): boolean {
  if (!userFunctions) return false
  return userFunctions.includes(functionCode)
}

/**
 * Check if user is board member
 */
export function isBoardMember(userRole: string | string[] | undefined): boolean {
  if (!userRole) return false
  if (Array.isArray(userRole)) {
    return userRole.includes('board')
  }
  return userRole.includes('board')
}
