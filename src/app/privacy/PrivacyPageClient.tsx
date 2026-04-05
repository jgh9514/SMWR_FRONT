'use client';

import NextLink from 'next/link';
import { Box, Container, Link, Typography } from '@mui/material';
import { SITE_NAME_DISPLAY } from '@/shared/lib/seo';

/** 운영 시 배포일에 맞춰 수정하세요. */
const POLICY_UPDATED_AT = '2026년 4월 5일';

const sectionSx = { mt: 4, mb: 1.5 } as const;
const h2Sx = { fontWeight: 800, fontSize: '1.1rem' } as const;
const pSx = { mb: 2, lineHeight: 1.8 } as const;
const listSx = { pl: 2.5, mb: 2, '& li': { mb: 0.75 }, lineHeight: 1.75 } as const;

export default function PrivacyPageClient() {
  return (
    <Container maxWidth="md" sx={{ py: 4, pb: 6 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 800 }}>
        개인정보 처리방침
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {`${SITE_NAME_DISPLAY}(이하 "서비스")는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보가 어떤 목적으로 어떻게 이용·보관되는지 투명하게 안내합니다.`}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
        시행일: {POLICY_UPDATED_AT} · 내용은 운영 정책·법령 변경에 따라 수정될 수 있으며, 중요한 변경 시
        공지사항 등을 통해 안내합니다.
      </Typography>

      <Box component="article" sx={{ typography: 'body2', color: 'text.primary' }}>
        <Typography component="h2" sx={{ ...h2Sx, mt: 0 }}>
          1. 처리하는 개인정보 항목
        </Typography>
        <Typography sx={pSx}>
          서비스는 목적에 필요한 최소한의 정보만 수집합니다. 대표적으로 아래와 같을 수 있습니다.
        </Typography>
        <Box component="ul" sx={listSx}>
          <li>
            <strong>회원 가입·로그인:</strong> 이메일 주소, 비밀번호(암호화 저장), 닉네임 등 계정 식별에 필요한
            정보
          </li>
          <li>
            <strong>본인 확인·계정 복구:</strong> 이메일 인증 코드, 비밀번호 재설정 과정에서 입력하는 정보
          </li>
          <li>
            <strong>게임·길드 연동 기능:</strong> 서비스 내에서 입력하거나 연동하는 게임 닉네임, 길드 식별자 등
            서비스 제공에 필요한 정보
          </li>
          <li>
            <strong>서비스 이용 과정에서 자동 수집:</strong> IP 주소, 쿠키, 접속 일시, 기기·브라우저 정보, 오류
            로그 등
          </li>
          <li>
            <strong>문의·고객 응대:</strong> 문의 시 이용자가 남긴 연락처·내용(필요한 범위 내)
          </li>
        </Box>
        <Typography sx={pSx}>
          실제 수집 항목은 가입 경로·기능 사용 여부에 따라 달라질 수 있으며, 수집 시점에 별도 동의·안내가 있는
          경우 그에 따릅니다.
        </Typography>

        <Typography component="h2" sx={sectionSx}>
          2. 개인정보의 처리 목적
        </Typography>
        <Box component="ul" sx={listSx}>
          <li>회원 가입·로그인 유지, 본인 확인, 부정 이용 방지</li>
          <li>전투 로그·데이터 업로드, 검색·통계·게시판 등 서비스 기능 제공</li>
          <li>서비스 개선, 통계 분석(식별 불가 형태로 가공하는 경우 포함), 오류 대응</li>
          <li>공지·안내, 문의 응대, 분쟁 대응</li>
          <li>관련 법령에 따른 의무 이행</li>
        </Box>

        <Typography component="h2" sx={sectionSx}>
          3. 처리 및 보유 기간
        </Typography>
        <Typography sx={pSx}>
          원칙적으로 개인정보는 <strong>처리 목적이 달성되면 지체 없이 파기</strong>합니다. 다만 관계 법령에
          따라 일정 기간 보관할 의무가 있는 경우에는 해당 기간 동안 보관합니다. 회원 탈퇴·동의 철회 시
          보관·파기 절차는 내부 정책 및 기술적 조건에 따라 처리됩니다.
        </Typography>

        <Typography component="h2" sx={sectionSx}>
          4. 개인정보의 제3자 제공
        </Typography>
        <Typography sx={pSx}>
          서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 이용자의 동의가 있거나,
          법령에 따른 요청이 있는 경우 등 예외적으로 제공될 수 있습니다. 그 경우 제공받는 자, 목적, 항목, 보유
          기간을 안내하는 것을 원칙으로 합니다.
        </Typography>

        <Typography component="h2" sx={sectionSx}>
          5. 개인정보 처리 위탁
        </Typography>
        <Typography sx={pSx}>
          원활한 서비스 제공을 위해 호스팅, 이메일 발송, 로그·보안 도구 등 일부 업무를 외부에 위탁할 수
          있습니다. 위탁 시에는 위탁 업무 내용, 수탁자, 보유·이용 기간 등을 관리하며, 재위탁 제한·파기·관리
          점검 등 필요한 조치를 합니다. 구체적인 수탁자 명단은 운영 환경에 따라 변경될 수 있으며, 변경 시
          공지합니다.
        </Typography>

        <Typography component="h2" sx={sectionSx}>
          6. 정보주체의 권리·의무 및 행사 방법
        </Typography>
        <Typography sx={pSx}>
          이용자는 언제든지 개인정보 열람·정정·삭제·처리 정지 요구 등 권리를 행사할 수 있습니다. 권리 행사는
          문의 채널을 통해 요청하실 수 있으며, 서비스는 지체 없이 조치하겠습니다. 다만 법령에서 열람·삭제를
          제한하는 경우에는 그에 따를 수 있습니다.
        </Typography>
        <Typography sx={pSx}>
          문의:{' '}
          <Link component={NextLink} href="/inquiry">
            문의하기
          </Link>
          페이지를 이용해 주세요.
        </Typography>

        <Typography component="h2" id="cookies" sx={{ ...sectionSx, scrollMarginTop: 96 }}>
          7. 쿠키 및 유사 기술
        </Typography>
        <Typography sx={pSx}>
          서비스는 로그인 세션 유지, 보안, 이용 통계, 선호 설정 저장 등을 위해 <strong>쿠키</strong> 또는
          브라우저 <strong>로컬 스토리지</strong> 등을 사용할 수 있습니다. 브라우저 설정에서 쿠키 저장을 거부할
          수 있으나, 로그인 유지 등 일부 기능이 제한될 수 있습니다.
        </Typography>

        <Typography component="h2" sx={sectionSx}>
          8. 개인정보의 안전성 확보 조치
        </Typography>
        <Box component="ul" sx={listSx}>
          <li>비밀번호 등 중요 정보의 암호화 저장</li>
          <li>접근 권한 관리, 계정 도용 방지를 위한 조치</li>
          <li>전송 구간 암호화(HTTPS 등) 및 보안 업데이트</li>
          <li>개인정보 취급 인원 최소화 및 교육</li>
        </Box>

        <Typography component="h2" sx={sectionSx}>
          9. 개인정보 보호책임자
        </Typography>
        <Typography sx={pSx}>
          개인정보 처리에 관한 문의·불만·피해 구제 등은 아래 문의 경로로 연락해 주시기 바랍니다. 운영 주체가
          개인 또는 단체인 경우, 실제 연락 가능한 이메일·처리 절차를 문의 페이지에 안내하는 것이 좋습니다.
        </Typography>
        <Typography sx={pSx}>
          <Link component={NextLink} href="/inquiry">
            문의하기
          </Link>{' '}
          · 서비스 내 공지사항을 참고해 주세요.
        </Typography>

        <Typography component="h2" sx={sectionSx}>
          10. 개인정보 처리방침의 변경
        </Typography>
        <Typography sx={pSx}>
          법령·서비스 변경에 따라 본 방침을 수정할 수 있습니다. 변경 시 시행일 및 변경 내용을 공지하며, 중대한
          변경의 경우 이용자에게 알리기 쉬운 방법으로 추가 안내할 수 있습니다.
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 4, lineHeight: 1.65 }}>
          본 문서는 일반적인 커뮤니티·비공식 데이터 서비스에 맞춘 안내입니다. 실제 수집 항목·보관 기간·수탁자는
          운영·배포 환경에 맞게 반드시 확인·보완하시기 바랍니다. 법적 검토가 필요한 경우 전문가 자문을 권장합니다.
        </Typography>
      </Box>
    </Container>
  );
}
