# RTA 몬스터별 통계 API 스펙

## 엔드포인트
`POST /api/v1/rta/monster-stats`

## 요청
```json
{}
```

## 응답
```json
{
  "stats": [
    {
      "monster_name": "몬스터 이름",
      "monster_image": "/images/monster/image.png",
      "pick_count": 1234,
      "pick_rate": 45.67,
      "win_rate": 52.34,
      "first_pick_rate": 12.34,
      "ban_rate": 8.90
    }
  ],
  "total_matches": 10000
}
```

## 필드 설명

### stats 배열
- `monster_name` (string, required): 몬스터 이름
- `monster_image` (string, optional): 몬스터 이미지 경로 (WAS 서버 경로)
- `pick_count` (number, required): 픽횟수 (해당 몬스터가 선택된 총 횟수)
- `pick_rate` (number, required): 픽률 (전체 매치 대비 픽 비율, %)
- `win_rate` (number, required): 승률 (해당 몬스터가 포함된 팀의 승률, %)
- `first_pick_rate` (number, required): 선픽율 (첫 번째 픽으로 선택된 비율, %)
- `ban_rate` (number, required): 벤율 (벤된 비율, %)

### total_matches
- `total_matches` (number, required): 전체 매치 수

## 계산 로직 예시

### 픽률 (pick_rate)
```
픽률 = (해당 몬스터가 선택된 횟수 / 전체 매치 수) * 100
```

### 승률 (win_rate)
```
승률 = (해당 몬스터가 포함된 팀이 승리한 횟수 / 해당 몬스터가 선택된 횟수) * 100
```

### 선픽율 (first_pick_rate)
```
선픽율 = (해당 몬스터가 첫 번째 픽으로 선택된 횟수 / 해당 몬스터가 선택된 횟수) * 100
```

### 벤율 (ban_rate)
```
벤율 = (해당 몬스터가 벤된 횟수 / 전체 매치 수) * 100
```

## 정렬
- 프론트엔드에서 클라이언트 사이드 정렬을 수행하므로, 백엔드에서는 기본 정렬만 제공하면 됩니다.
- 권장 기본 정렬: `pick_count` 내림차순

## 예시 응답
```json
{
  "stats": [
    {
      "monster_name": "펜리르",
      "monster_image": "/images/Wind_a/Fenrir_Wind_a_Icon.png",
      "pick_count": 5000,
      "pick_rate": 50.0,
      "win_rate": 55.5,
      "first_pick_rate": 20.0,
      "ban_rate": 15.0
    },
    {
      "monster_name": "발키리",
      "monster_image": "/images/Water_a/Valkyrie_Water_a_Icon.png",
      "pick_count": 4500,
      "pick_rate": 45.0,
      "win_rate": 52.3,
      "first_pick_rate": 18.5,
      "ban_rate": 12.5
    }
  ],
  "total_matches": 10000
}
```

