-- Example partition setup for the Yellow Dot network.
-- This file is intentionally optional and should be adapted per deployment.

-- First-level partition by network + domain.
CREATE TABLE items_yellow_dot_student
PARTITION OF items
FOR VALUES IN (('yellow_dot', 'student'))
PARTITION BY LIST (item_type);

CREATE TABLE items_yellow_dot_tutor
PARTITION OF items
FOR VALUES IN (('yellow_dot', 'tutor'))
PARTITION BY LIST (item_type);

CREATE TABLE items_yellow_dot_coaching_center
PARTITION OF items
FOR VALUES IN (('yellow_dot', 'coaching_center'))
PARTITION BY LIST (item_type);

-- Second-level partition by item type within a network/domain.
CREATE TABLE items_yellow_dot_student_profile
PARTITION OF items_yellow_dot_student
FOR VALUES IN ('profile');

CREATE TABLE items_yellow_dot_tutor_profile
PARTITION OF items_yellow_dot_tutor
FOR VALUES IN ('profile');

CREATE TABLE items_yellow_dot_coaching_center_profile
PARTITION OF items_yellow_dot_coaching_center
FOR VALUES IN ('profile');

CREATE TABLE item_events_yellow_dot_student
PARTITION OF item_events
FOR VALUES IN (('yellow_dot', 'student'))
PARTITION BY LIST (event_type);

CREATE TABLE item_events_yellow_dot_tutor
PARTITION OF item_events
FOR VALUES IN (('yellow_dot', 'tutor'))
PARTITION BY LIST (event_type);

CREATE TABLE item_events_yellow_dot_coaching_center
PARTITION OF item_events
FOR VALUES IN (('yellow_dot', 'coaching_center'))
PARTITION BY LIST (event_type);

CREATE TABLE item_events_yellow_dot_student_connect
PARTITION OF item_events_yellow_dot_student
FOR VALUES IN ('connect');

CREATE TABLE item_events_yellow_dot_tutor_connect
PARTITION OF item_events_yellow_dot_tutor
FOR VALUES IN ('connect');

CREATE TABLE item_events_yellow_dot_coaching_center_connect
PARTITION OF item_events_yellow_dot_coaching_center
FOR VALUES IN ('connect');
