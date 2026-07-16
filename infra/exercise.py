from datetime import datetime, timedelta


class AssetRepository:
    def __init__(self):
        self.assets = {}

    def create_asset(
        self,
        asset_id: str,
        name: str,
        site_id: str,
        criticality: int,
    ) -> dict:
        if asset_id in self.assets:
            raise ValueError("Asset already exists")

        asset = {
            "id": asset_id,
            "name": name,
            "site_id": site_id,
            "criticality": criticality,
            "last_seen": datetime.now(),
            "is_online": True,
            "events": [],
        }

        self.assets[asset_id] = asset
        return asset

    def get_asset(self, asset_id: str) -> dict | None:
        return self.assets.get(asset_id)

    def get_all_assets(self) -> list[dict]:
        return list(self.assets.values())


class EventService:
    def __init__(self, asset_repository: AssetRepository):
        self.asset_repository = asset_repository

    def report_activity(
        self,
        asset_id: str,
        activity_time: datetime,
    ) -> None:
        asset = self.asset_repository.get_asset(asset_id)

        if asset is None:
            raise ValueError("Asset not found")

        asset["last_seen"] = activity_time
        asset["is_online"] = True

    def add_security_event(
        self,
        asset_id: str,
        event_type: str,
        severity: int,
        event_time: datetime,
    ) -> None:
        asset = self.asset_repository.get_asset(asset_id)

        if asset is None:
            raise ValueError("Asset not found")

        event = {
            "type": event_type,
            "severity": severity,
            "event_time": event_time,
            "resolved": False,
        }

        asset["events"].append(event)

    def resolve_event(
        self,
        asset_id: str,
        event_type: str,
    ) -> None:
        asset = self.asset_repository.get_asset(asset_id)

        if asset is None:
            raise ValueError("Asset not found")

        for event in asset["events"]:
            if event["type"] == event_type:
                event["resolved"] = True


class MonitoringService:
    def __init__(
        self,
        asset_repository: AssetRepository,
        offline_timeout_minutes: int,
    ):
        self.asset_repository = asset_repository
        self.offline_timeout_minutes = offline_timeout_minutes

    def update_online_statuses(self, current_time: datetime) -> None:
        offline_threshold = current_time - timedelta(
            minutes=self.offline_timeout_minutes
        )

        for asset in self.asset_repository.get_all_assets():
            asset["is_online"] = asset["last_seen"] >= offline_threshold

    def get_active_events(
        self,
        asset: dict,
        current_time: datetime,
    ) -> list[dict]:
        event_threshold = current_time - timedelta(hours=24) # Events from the last 24 hours are considered active.

        active_events = [
            event
            for event in asset["events"]
            if not event["resolved"]
            and event["event_time"] >= event_threshold
        ]

        return active_events

    def calculate_risk_score(
        self,
        asset: dict, # asset-2, severity=7, OFFLINE ,criticality=4,
        current_time: datetime,
    ) -> int:
        active_events = self.get_active_events(
            asset,
            current_time,
        )

        score = asset["criticality"] # 4

        for event in active_events:
            score += event["severity"] # 4 + 7 = 11

        if not asset["is_online"]: # 11 + 5 = 16
            score += 5

        return score

    def get_high_risk_assets(
        self,
        current_time: datetime,
    ) -> list[dict]:
        high_risk_assets = []

        for asset in self.asset_repository.get_all_assets():
            risk_score = self.calculate_risk_score(
                asset,
                current_time,
            )

            if risk_score >= 15:
                high_risk_assets.append(
                    {
                        "asset_id": asset["id"],
                        "name": asset["name"],
                        "risk_score": risk_score,
                    }
                )

        return high_risk_assets


class SiteSummaryService:
    def __init__(
        self,
        asset_repository: AssetRepository,
        monitoring_service: MonitoringService,
    ):
        self.asset_repository = asset_repository
        self.monitoring_service = monitoring_service

    def build_site_summary(
        self,
        site_id: str,
        current_time: datetime,
    ) -> dict:
        site_assets = [
            asset
            for asset in self.asset_repository.get_all_assets()
            if asset["site_id"] == site_id
        ]

        online_count = 0
        offline_count = 0
        total_active_events = 0

        for asset in site_assets:
            if asset["is_online"]:
                online_count += 1
            else:
                offline_count += 1

            active_events = self.monitoring_service.get_active_events(
                asset,
                current_time,
            )

            total_active_events = len(active_events)

        return {
            "site_id": site_id,
            "total_assets": len(site_assets),
            "online_assets": online_count,
            "offline_assets": offline_count,
            "active_events": total_active_events,
        }


current_time = datetime(
    year=2026,
    month=7,
    day=15,
    hour=12,
    minute=0,
)

asset_repository = AssetRepository()
event_service = EventService(asset_repository)
monitoring_service = MonitoringService(
    asset_repository=asset_repository,
    offline_timeout_minutes=5,
)
site_summary_service = SiteSummaryService(
    asset_repository=asset_repository,
    monitoring_service=monitoring_service,
)


asset_repository.create_asset(
    asset_id="asset-1",
    name="Production PLC",
    site_id="site-a",
    criticality=8,
) 
# asset_repository: [{asset-1, online: true},{}]

asset_repository.create_asset(
    asset_id="asset-2",
    name="Engineering Workstation",
    site_id="site-a",
    criticality=4,
)
# asset_repository: [{asset-1, online: true},{asset-2, online: true}]


event_service.report_activity(
    asset_id="asset-1",
    activity_time=current_time - timedelta(minutes=2),
)

event_service.report_activity(
    asset_id="asset-2",
    activity_time=current_time - timedelta(minutes=10),
)
# asset_repository: [{asset-1, online: true},{asset-2, online: true}]



event_service.add_security_event(
    asset_id="asset-1",
    event_type="UNAUTHORIZED_ACCESS",
    severity=9,
    event_time=current_time - timedelta(hours=1),
)

event_service.add_security_event(
    asset_id="asset-2",
    event_type="MALWARE_DETECTED",
    severity=7,
    event_time=current_time - timedelta(hours=2),
)


monitoring_service.update_online_statuses(current_time)
# asset_repository: [{asset-1, online: true},{asset-2, online: false}]

high_risk_assets = monitoring_service.get_high_risk_assets(
    current_time
)
# asset-1: risk_score = 8 (criticality) + 9 (severity) = 17,
# asset-2: risk_score = 4 (criticality) + 7 (severity) = 16,

site_summary = site_summary_service.build_site_summary(
    site_id="site-a",
    current_time=current_time,
)


print("High-risk assets:")
print(high_risk_assets)

print("Site summary:")
print(site_summary)