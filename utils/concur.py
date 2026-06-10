"""Concurrency helpers."""

import argparse
import sys
import types
import typing
from collections import abc
from concurrent import futures

from utils import log

# The following types provide executors that execute sequentially if the
# `--sequential` command-line flag is passed.
# This is useful in the following situations:
# - Comparing the latencies of sequential and concurrent execution.
# - Profiling to find the bottlenecks, as cProfile is unable to profile child
#   tasks.
# NOTE: When you pass `--sequential` to force sequential execution for the
# purpose of profiling, be careful as the analysis may be misleading, and may
# deviate substantially from the behavior observed when executing concurrently.
# This was found to be the case when the use of ProcessPoolExecutor in Xooxle,
# as opposed to ThreadPoolExecutor, resulted in a degradation in performance by
# a factor of roughly 20! Profiling was misleading, as the bottleneck could
# only be observed when executing concurrently, and when using
# ProcessPoolExecutor!
# TODO: (#0) Prevent the use of futures.ProcessPoolExecutor and
# futures.ThreadPoolExecutor directly in the code, in order for the
# `--sequential` flag to be respected everywhere.


def _sequential_from_argv() -> bool:
    parser: argparse.ArgumentParser = argparse.ArgumentParser(add_help=False)
    _ = parser.add_argument(
        "--sequential",
        action="store_true",
        help="Force sequential (non-concurrent) execution.",
    )
    # Consume `--sequential` so importing scripts don't see (and reject) it
    # via their own strict `parse_args`. Everything else is left untouched.
    args, remaining = parser.parse_known_args()
    sys.argv[1:] = remaining
    return args.sequential


SEQUENTIAL = _sequential_from_argv()
if SEQUENTIAL:
    log.info(
        "Sequential execution forced by the",
        "--sequential",
        "flag",
    )


class SequentialExecutor:
    """SequentialExecutor is an executor that executes tasks sequentially.

    NOTE: To make sure any errors encountered during the execution of the child
    tasks propagate to the parent task, make sure to loop over the generator
    returned by the `map` method.
        with utils.ThreadPoolExecutor() as executor:
          # Code that uses `data`.
    If the returned data doesn't need to be used, you can simply convert the
    generator to a list:
        with utils.ThreadPoolExecutor() as executor:
          list(executor.map(fn, data))
    Our types don't implement a `submit` method despite its convenient because
    it's tricker to mimic, and error propagation with `submit` is also trickier.

    """

    def map[T, R](
        self,
        fn: typing.Callable[[T], R],
        *iterables: abc.Iterable[T],
    ) -> abc.Iterator[R]:
        return map(fn, *iterables)

    def __enter__(self):
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: types.TracebackType | None,
    ):
        pass


def process_pool_executor() -> (
    futures.ProcessPoolExecutor | SequentialExecutor
):
    """
    NOTE: `ProcessPoolExecutor` has a few caveats:
    - It requires all the tasks to be picklable, thus it's problematic with
      lambdas and closures, and often complains about generators.
    - Our static-scope variables are shared between threads, but not between
      processes! This can corrupt non-process-safe caches, for example.
    - In our experimentation, processing time often soared when using
      `ProcessPoolExecutor` instead of `ThreadPoolExecutor`, possibly because of
      unexpected cache / static-scope behavior.

    Returns:
        A concurrent or sequential executor.
    """
    return (
        SequentialExecutor() if SEQUENTIAL else futures.ProcessPoolExecutor()
    )


def thread_pool_executor() -> futures.ThreadPoolExecutor | SequentialExecutor:
    return SequentialExecutor() if SEQUENTIAL else futures.ThreadPoolExecutor()
