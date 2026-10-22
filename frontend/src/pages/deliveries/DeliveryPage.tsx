import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileCheck2, Upload } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { WorkflowBackLink, WorkflowPageFrame } from '@/components/WorkflowPageFrame';
import { Button } from '@/components/ui/button';
import { AccessNotice } from '@/features/applications/components/AccessNotice';
import * as api from '@/features/deliveries/api';
import { useAuthStore } from '@/stores/auth.store';

export function DeliveryPage() {
  const { contractId = '' } = useParams();
  const user = useAuthStore((state) => state.user);
  const query = useQuery({
    queryKey: ['deliveries', user?.id, user?.role, contractId],
    queryFn: () => api.getDelivery(contractId),
    enabled: Boolean(user && contractId),
    refetchInterval: 30_000,
    staleTime: 0,
  });
  if (!user)
    return (
      <AccessNotice
        title="로그인이 필요합니다"
        description="계약 결과물을 확인하려면 로그인해 주세요."
        showLoginLink
      />
    );
  if (query.isPending)
    return (
      <p role="status" className="px-5 py-24 text-center text-slate-500">
        결과물을 불러오는 중...
      </p>
    );
  if (query.isError)
    return (
      <section className="py-12 text-center">
        <AccessNotice
          title="결과물을 불러오지 못했습니다"
          description={api.deliveryError(query.error)}
        />
        <Button variant="outline" onClick={() => void query.refetch()}>
          다시 시도
        </Button>
      </section>
    );
  return (
    <DeliveryContent
      key={`${user.id}:${contractId}`}
      data={query.data}
      isClient={user.role === 'CLIENT' && user.id === query.data.clientId}
    />
  );
}

function DeliveryContent({ data, isClient }: { data: api.DeliveryPageData; isClient: boolean }) {
  const queryClient = useQueryClient();
  const [agreed, setAgreed] = useState(false);
  const download = useMutation({
    mutationFn: (path: string) => api.downloadAttachment(data.contractId, path),
    onSuccess: (url) => window.location.assign(url),
  });
  const approve = useMutation({
    mutationFn: () => api.approveDelivery(data.delivery!.id),
    onSuccess: async () => {
      await Promise.all(
        ['deliveries', 'contracts', 'projects', 'notifications'].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      );
    },
  });
  const delivery = data.delivery;
  const currentStep = !delivery ? 0 : delivery.status === 'APPROVED' ? 2 : 1;
  return (
    <WorkflowPageFrame size="wide">
      <WorkflowBackLink to={`/contracts/${data.contractId}`}>계약서로 돌아가기</WorkflowBackLink>
      <div className="mt-8 flex items-center gap-3">
        <span className="rounded-2xl bg-white p-3 text-[#0071e3] shadow-[0_14px_35px_rgba(15,23,42,0.08)]">
          <FileCheck2 aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-bold text-[#0071e3]">프로젝트 마무리</p>
          <h1 className="mt-1 text-4xl font-black tracking-[-0.035em] sm:text-5xl">
            결과물 제출 · 확인
          </h1>
        </div>
      </div>
      <p className="mt-4 text-lg text-[#6e6e73]">{data.projectTitle}</p>
      <ol className="mt-8 grid grid-cols-1 gap-2 rounded-[1.5rem] border border-black/5 bg-white/80 p-3 text-center text-sm font-bold shadow-[0_16px_45px_rgba(15,23,42,0.06)] sm:grid-cols-3">
        {['1. 결과물 제출', '2. 의뢰인 확인', '3. 승인 및 정산'].map((label, index) => (
          <li
            key={label}
            aria-current={index === currentStep ? 'step' : undefined}
            className={
              index <= currentStep
                ? 'rounded-2xl bg-[#0071e3] px-2 py-3 text-white'
                : 'rounded-2xl bg-[#f5f5f7] px-2 py-3 text-slate-600'
            }
          >
            {label}
          </li>
        ))}
      </ol>
      {delivery ? (
        <article className="mt-8 rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">제출된 결과물</h2>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
              {delivery.status === 'APPROVED' ? '승인 완료' : '확인 대기'}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            제출일 {new Date(delivery.submittedAt).toLocaleString('ko-KR')}
          </p>
          <p className="mt-6 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
            {delivery.message}
          </p>
          {delivery.resultUrl && /^https?:\/\//i.test(delivery.resultUrl) ? (
            <a
              href={delivery.resultUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 block break-all font-semibold text-brand-600 underline"
            >
              결과물 링크 열기
            </a>
          ) : null}
          {delivery.attachmentUrls?.length ? (
            <div className="mt-6">
              <h3 className="font-semibold">첨부파일</h3>
              <ul className="mt-3 grid gap-2">
                {delivery.attachmentUrls.map((path) => (
                  <li key={path}>
                    <Button
                      variant="outline"
                      className="max-w-full gap-2 rounded-full px-5 font-bold"
                      disabled={download.isPending}
                      onClick={() => download.mutate(path)}
                    >
                      <Download className="size-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{path.split('/').at(-1)}</span>
                    </Button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">
                계약 당사자에게만 임시 다운로드 링크를 발급합니다.
              </p>
            </div>
          ) : null}
          {download.isError ? (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {api.deliveryError(download.error)}
            </p>
          ) : null}
          {delivery.status === 'APPROVED' ? (
            <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
              <p>결과물이 승인되어 프로젝트가 완료되었습니다.</p>
              <Link
                className="mt-2 inline-block font-bold underline"
                to={`/contracts/${data.contractId}/review`}
              >
                리뷰 작성하기
              </Link>
            </div>
          ) : isClient ? (
            <div className="mt-8 border-t border-slate-100 pt-6">
              {!data.settlementAvailable ? (
                <p
                  role="status"
                  className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-800"
                >
                  정산 기능 연결을 준비 중입니다. 결과물 확인과 다운로드는 가능하며, 승인 버튼은
                  정산 연결 후 활성화됩니다.
                </p>
              ) : null}
              <label className="mt-5 flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={agreed}
                  disabled={!data.canApprove || approve.isPending}
                  onChange={(event) => setAgreed(event.target.checked)}
                />
                결과물을 확인했으며, 승인 시 프로젝트가 완료되고 정산되는 것에 동의합니다.
              </label>
              <Button
                className="mt-5 rounded-full px-5 font-bold"
                disabled={!data.canApprove || !agreed || approve.isPending}
                onClick={() => approve.mutate()}
              >
                {approve.isPending ? '승인 처리 중...' : '결과물 승인하기'}
              </Button>
              {approve.isError ? (
                <p role="alert" className="mt-4 text-sm text-red-600">
                  {api.deliveryError(approve.error)}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              제출이 완료되었습니다. 의뢰인의 확인을 기다려 주세요. 최종 제출 후에는 수정하거나 다시
              제출할 수 없습니다.
            </p>
          )}
        </article>
      ) : data.canSubmit ? (
        <DeliveryForm data={data} />
      ) : (
        <div className="mt-8 rounded-[2rem] border border-black/5 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <h2 className="text-lg font-bold">아직 제출된 결과물이 없습니다</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {data.projectTransactionStatus === 'IN_PROGRESS'
              ? '계약한 프리랜서가 결과물을 제출하면 여기에서 확인할 수 있습니다.'
              : '계약 서명과 결제가 완료되어 작업 중인 프로젝트에서 결과물을 제출할 수 있습니다.'}
          </p>
        </div>
      )}
    </WorkflowPageFrame>
  );
}

function DeliveryForm({ data }: { data: api.DeliveryPageData }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [validation, setValidation] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      if (attachments.length + files.length > data.uploadPolicy.maxFiles)
        throw new Error(`파일은 최대 ${data.uploadPolicy.maxFiles}개까지 첨부할 수 있습니다.`);
      for (const file of files) {
        const extension = file.name.split('.').at(-1)?.toLowerCase() ?? '';
        if (
          file.size <= 0 ||
          file.size > data.uploadPolicy.maxBytes ||
          !data.uploadPolicy.extensions.includes(extension)
        )
          throw new Error('파일 형식과 크기를 확인해 주세요. 빈 파일은 업로드할 수 없습니다.');
      }
      for (const file of files) {
        const path = await api.uploadAttachment(data.contractId, file);
        setAttachments((previous) => [...previous, path]);
      }
    },
  });
  const submit = useMutation({
    mutationFn: (input: api.SubmitDeliveryInput) => api.submitDelivery(data.contractId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deliveries'] }),
  });
  const busy = upload.isPending || submit.isPending;
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const text = message.trim();
    const url = resultUrl.trim();
    if (text.length < 10 || text.length > 5000) {
      setValidation('결과 설명을 10~5,000자로 입력해 주세요.');
      return;
    }
    if (url) {
      try {
        if (!['http:', 'https:'].includes(new URL(url).protocol)) throw new Error();
      } catch {
        setValidation('결과물 링크는 올바른 http 또는 https 주소여야 합니다.');
        return;
      }
    }
    if (!confirmed) {
      setValidation('최종 제출 안내에 동의해 주세요.');
      return;
    }
    setValidation('');
    submit.mutate({ message: text, resultUrl: url || null, attachmentUrls: attachments });
  }
  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="mt-8 grid gap-6 rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8"
    >
      <div>
        <h2 className="text-xl font-bold">완성한 결과물을 전달해 주세요</h2>
        <p className="mt-2 text-sm text-slate-500">
          작업 내용을 설명하고, 결과물 링크나 파일을 함께 제출할 수 있습니다.
        </p>
      </div>
      <div>
        <label htmlFor="delivery-message" className="text-sm font-semibold">
          결과 설명 (필수)
        </label>
        <textarea
          id="delivery-message"
          rows={7}
          maxLength={5000}
          value={message}
          disabled={busy}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="완료한 작업, 결과물 사용 방법, 확인할 사항을 적어 주세요."
          className="mt-2 w-full rounded-2xl border border-black/10 bg-[#f5f5f7] px-4 py-3.5 text-sm outline-none transition focus:border-[#0071e3] focus:bg-white focus:ring-4 focus:ring-blue-100"
        />
        <p className="mt-1 text-right text-xs text-slate-400">{message.length} / 5,000자</p>
      </div>
      <div>
        <label htmlFor="delivery-url" className="text-sm font-semibold">
          결과물 링크 (선택)
        </label>
        <input
          id="delivery-url"
          type="url"
          maxLength={2048}
          value={resultUrl}
          disabled={busy}
          onChange={(event) => setResultUrl(event.target.value)}
          placeholder="https://"
          className="mt-2 w-full rounded-2xl border border-black/10 bg-[#f5f5f7] px-4 py-3.5 text-sm outline-none transition focus:border-[#0071e3] focus:bg-white focus:ring-4 focus:ring-blue-100"
        />
      </div>
      <div>
        <label htmlFor="delivery-files" className="flex items-center gap-2 text-sm font-semibold">
          <Upload className="size-4" aria-hidden="true" />
          첨부파일 (선택)
        </label>
        <p id="delivery-file-help" className="mt-2 text-xs leading-5 text-slate-500">
          최대 {data.uploadPolicy.maxFiles}개, 파일당{' '}
          {Math.floor(data.uploadPolicy.maxBytes / 1024 / 1024)}MB ·{' '}
          {data.uploadPolicy.extensions.join(', ')}
        </p>
        <input
          id="delivery-files"
          type="file"
          multiple
          aria-describedby="delivery-file-help"
          accept={data.uploadPolicy.extensions.map((extension) => `.${extension}`).join(',')}
          disabled={
            busy || !data.storageConfigured || attachments.length >= data.uploadPolicy.maxFiles
          }
          className="mt-3 w-full rounded-2xl border border-dashed border-black/15 bg-[#f5f5f7] p-4 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:font-bold"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = '';
            if (files.length) upload.mutate(files);
          }}
        />
        {!data.storageConfigured ? (
          <p className="mt-2 text-sm text-amber-700">
            파일 저장소 연결 전입니다. 설명과 링크는 제출할 수 있습니다.
          </p>
        ) : null}
        {upload.isPending ? (
          <p role="status" className="mt-2 text-sm text-brand-600">
            파일 업로드 중... 완료될 때까지 기다려 주세요.
          </p>
        ) : null}
        {attachments.length ? (
          <ul className="mt-3 grid gap-2">
            {attachments.map((path) => (
              <li
                key={path}
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"
              >
                <span className="truncate">{path.split('/').at(-1)}</span>
                <button
                  type="button"
                  disabled={busy}
                  className="shrink-0 font-semibold text-slate-500"
                  aria-label={`${path.split('/').at(-1)} 첨부 취소`}
                  onClick={() =>
                    setAttachments((previous) => previous.filter((item) => item !== path))
                  }
                >
                  첨부 취소
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {upload.isError ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {api.deliveryError(upload.error)}
          </p>
        ) : null}
      </div>
      <label className="flex items-start gap-3 rounded-2xl bg-[#f5f5f7] p-4 text-sm leading-6">
        <input
          type="checkbox"
          className="mt-1.5"
          checked={confirmed}
          disabled={busy}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        최종 제출 후에는 수정하거나 다시 제출할 수 없음을 확인했습니다.
      </label>
      {validation || submit.isError ? (
        <p role="alert" className="text-sm text-red-600">
          {validation || api.deliveryError(submit.error)}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button className="rounded-full px-5 font-bold" type="submit" disabled={busy || !confirmed}>
          {submit.isPending ? '제출 중...' : '최종 결과물 제출'}
        </Button>
      </div>
    </form>
  );
}
