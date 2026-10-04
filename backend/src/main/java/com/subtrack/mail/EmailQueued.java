package com.subtrack.mail;

import java.util.UUID;

/** Published when an email is saved in the outbox. Heard only once that transaction commits. */
record EmailQueued(UUID emailId) {
}
