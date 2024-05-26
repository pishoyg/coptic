import typing

import type_enforced

Callable = typing.Callable | type_enforced.enforcer.FunctionMethodEnforcer

import field

Field = type_enforced.utils.WithSubclasses(field.field)
OptionalField = type_enforced.utils.WithSubclasses(field.field) + [None]
