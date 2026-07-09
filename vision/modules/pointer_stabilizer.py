# AETHER OS — Pointer Stabilizer Module (Phase 4.5)
import math
import time
from utils import log_success, log_info, log_error
from config import STABILIZER_CALIBRATION

class LowPassFilter:
    """
    Standard single-pole Low Pass Filter.
    """
    def __init__(self, alpha):
        self.alpha = alpha
        self.y = None

    def filter(self, value):
        if self.y is None:
            self.y = value
        else:
            self.y = self.alpha * value + (1.0 - self.alpha) * self.y
        return self.y

    def reset(self):
        self.y = None


class OneEuroFilter:
    """
    1€ (One Euro) Filter: Dynamic cutoff frequency filter.
    Optimized to minimize jitter at low speeds and minimize lag at high speeds.
    """
    def __init__(self, freq, mincutoff=0.8, beta=0.03, dcutoff=1.0):
        self.freq = freq
        self.mincutoff = mincutoff
        self.beta = beta
        self.dcutoff = dcutoff
        
        self.x_filter = LowPassFilter(self.alpha_dynamic(mincutoff, 1.0 / freq))
        self.dx_filter = LowPassFilter(self.alpha_dynamic(dcutoff, 1.0 / freq))
        self.last_time = None
        self.prev_x = None

    def alpha_dynamic(self, cutoff, dt):
        tau = 1.0 / (2.0 * math.pi * cutoff)
        return 1.0 / (1.0 + tau / dt)

    def filter(self, x, timestamp=None):
        if timestamp is None:
            timestamp = time.time()

        if self.last_time is None or self.prev_x is None:
            self.last_time = timestamp
            self.prev_x = x
            self.x_filter.reset()
            self.dx_filter.reset()
            self.x_filter.filter(x)
            self.dx_filter.filter(0.0)
            return x

        dt = timestamp - self.last_time
        if dt <= 0:
            dt = 1.0 / self.freq

        self.last_time = timestamp

        # Compute speed / velocity derivative
        dx = (x - self.prev_x) / dt
        self.prev_x = x

        # Filter the derivative
        self.dx_filter.alpha = self.alpha_dynamic(self.dcutoff, dt)
        edx = self.dx_filter.filter(dx)

        # Dynamic cutoff frequency based on velocity amplitude
        cutoff = self.mincutoff + self.beta * abs(edx)

        # Filter coordinates using dynamic cutoff alpha
        self.x_filter.alpha = self.alpha_dynamic(cutoff, dt)
        return self.x_filter.filter(x)

    def reset(self):
        self.last_time = None
        self.prev_x = None
        self.x_filter.reset()
        self.dx_filter.reset()


class PointerStabilizerModule:
    """
    Stabilizes raw pointer coordinates using interchangeable strategies.
    Supports:
      - "ema": Exponential Moving Average (Phase 4.3 legacy)
      - "one_euro": One Euro Adaptive Filter (Phase 4.5 default)
    """

    def __init__(self, strategy="one_euro", alpha=0.25):
        self.strategy = strategy
        self.prev_x = None
        self.prev_y = None
        
        # EMA legacy parameters
        self.alpha = max(0.01, min(1.0, alpha))
        
        # One Euro parameters
        self.freq = 30.0        # Telemetry sample rate
        self.min_cutoff = STABILIZER_CALIBRATION.get("min_cutoff", 0.5)
        self.beta = STABILIZER_CALIBRATION.get("beta", 0.04)
        self.d_cutoff = STABILIZER_CALIBRATION.get("d_cutoff", 1.5)
        
        self.one_euro_x = None
        self.one_euro_y = None
        
        self._initialize_filters()
        log_success(f"✓ Pointer Stabilizer Initialized (strategy={self.strategy})")

    def _initialize_filters(self):
        if self.strategy == "one_euro":
            self.one_euro_x = OneEuroFilter(self.freq, self.min_cutoff, self.beta, self.d_cutoff)
            self.one_euro_y = OneEuroFilter(self.freq, self.min_cutoff, self.beta, self.d_cutoff)

    def stabilize(self, pointer):
        """
        Processes coordinates and applies stabilization according to current strategy.
        """
        # Default pointer payload if invisible / lost tracking
        if not pointer.get("visible", False):
            self.prev_x = None
            self.prev_y = None
            if self.strategy == "one_euro":
                self.one_euro_x.reset()
                self.one_euro_y.reset()
            return {
                "x": 0.0,
                "y": 0.0,
                "visible": False,
                "pinching": False,
                "raw": {"x": 0.0, "y": 0.0},
                "stable": {"x": 0.0, "y": 0.0}
            }

        try:
            raw_x = pointer["x"]
            raw_y = pointer["y"]

            if self.strategy == "one_euro":
                stable_x = self.one_euro_x.filter(raw_x)
                stable_y = self.one_euro_y.filter(raw_y)
            else:
                # Fallback to Exponential Moving Average
                if self.prev_x is None or self.prev_y is None:
                    stable_x = raw_x
                    stable_y = raw_y
                else:
                    stable_x = self.alpha * raw_x + (1.0 - self.alpha) * self.prev_x
                    stable_y = self.alpha * raw_y + (1.0 - self.alpha) * self.prev_y

            # Track historical states
            self.prev_x = stable_x
            self.prev_y = stable_y

            return {
                "x": round(stable_x, 6),
                "y": round(stable_y, 6),
                "visible": True,
                "pinching": pointer.get("pinching", False),
                "raw": {
                    "x": round(raw_x, 6),
                    "y": round(raw_y, 6)
                },
                "stable": {
                    "x": round(stable_x, 6),
                    "y": round(stable_y, 6)
                }
            }

        except Exception as e:
            # Graceful degradation fallback
            return {
                "x": pointer.get("x", 0.0),
                "y": pointer.get("y", 0.0),
                "visible": pointer.get("visible", False),
                "pinching": pointer.get("pinching", False),
                "raw": {"x": pointer.get("x", 0.0), "y": pointer.get("y", 0.0)},
                "stable": {"x": pointer.get("x", 0.0), "y": pointer.get("y", 0.0)}
            }
