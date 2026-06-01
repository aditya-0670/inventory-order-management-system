from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard import DashboardSummary


class DashboardService:
    def __init__(self, repository: DashboardRepository, low_stock_threshold: int):
        self.repository = repository
        self.low_stock_threshold = low_stock_threshold

    def get_summary(self) -> DashboardSummary:
        low_stock_products = self.repository.list_low_stock_products(self.low_stock_threshold)
        return DashboardSummary(
            total_products=self.repository.count_active_products(),
            total_customers=self.repository.count_active_customers(),
            total_orders=self.repository.count_orders(),
            low_stock_count=len(low_stock_products),
            low_stock_products=list(low_stock_products),
        )
