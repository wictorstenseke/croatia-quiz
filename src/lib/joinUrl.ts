/**
 * The address a phone should open to join the room.
 *
 * This is a fixed constant rather than `window.location.origin` +
 * `window.location.pathname`. The presenter tests from `localhost` or a LAN
 * address (`http://192.168.1.19:5173`) as often as from the deployed site,
 * and neither of those means anything to a phone in the room — a QR code or
 * link built from them would be dead on arrival exactly when someone tries
 * it. Local and deployed builds point at the same Firebase project, though,
 * so a phone that opens the deployed URL joins the very same live session as
 * a presenter driving the deck from localhost. The join address only ever
 * needs to be the deployed one — do not derive it from `window.location`
 * again, that is exactly the bug this constant exists to avoid.
 */
export const JOIN_URL = 'https://wictorstenseke.github.io/croatia-quiz/#/spela'
