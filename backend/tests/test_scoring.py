import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace as NS
from backend.scoring import score_customer

class ScoringTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 10, 25, 12, tzinfo=timezone.utc)
        self.account = NS(id=1, email="demo@example.test", balance=0, bonus_balance=10000,
                          bonus_state="locked", withdraw_balance=100000, total_replenished=100)
        self.settings = NS(weights={"prolong_wait":45,"insufficient_balance":35,"autoprolong_disabled":20},
                           horizon_days=7, medium_threshold=30, high_threshold=60)
    def service(self, **changes):
        values = dict(id=1, owner_id=1, name="demo", status="active", price=1000,
                      payment_term="month", auto_prolong=False, expires_at=self.now + timedelta(days=1))
        values.update(changes)
        return NS(**values)
    def calculate(self, services):
        return score_customer(self.account, services, self.settings, self.now)
    def test_no_services(self):
        row = self.calculate([])
        self.assertIsNone(row["score"])
        self.assertEqual((row["level"], row["potentialLoss"]), ("none", 0))
    def test_locked_bonus_and_withdraw_are_not_funds(self):
        row = self.calculate([self.service()])
        self.assertEqual((row["score"], row["potentialLoss"]), (55, 550))
    def test_unlocked_bonus(self):
        self.account.bonus_state = "unlocked"
        self.assertEqual(self.calculate([self.service()])["score"], 20)
    def test_deleted_and_blocked_excluded(self):
        row = self.calculate([self.service(status="deleted"), self.service(id=2,status="blocked")])
        self.assertEqual((row["score"], row["potentialLoss"]), (0, 0))
    def test_suspended_included(self):
        self.assertEqual(self.calculate([self.service(status="suspended")])["potentialLoss"], 550)
    def test_normalization(self):
        a = self.calculate([self.service()])["score"]
        self.settings.weights = {k:v*2 for k,v in self.settings.weights.items()}
        self.assertEqual(self.calculate([self.service()])["score"], a)
    def test_prolong_wait(self):
        row = self.calculate([self.service(status="prolong_wait", expires_at=self.now-timedelta(days=1))])
        self.assertEqual(row["score"], 45)
        self.account.balance=1000
        self.assertEqual(self.calculate([self.service(status="prolong_wait", expires_at=self.now-timedelta(days=1))])["score"],27)
    def test_hourly_monthly_equivalent(self):
        self.assertEqual(self.calculate([self.service(payment_term="hour")])["potentialLoss"],396000)

if __name__ == "__main__":
    unittest.main()
