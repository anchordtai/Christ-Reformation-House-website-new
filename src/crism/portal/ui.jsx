export function Field({label,value,onChange,area=false,...props}){const Tag=area?'textarea':'input';return <label>{label}<Tag value={value??''} onChange={e=>onChange(e.target.value)} {...props}/></label>}
export function Button({children,...props}){return <button className="crism-button navy" {...props}>{children}</button>}
export function Notice({error,children}){return <p className={'school-notice '+(error?'error':'')} role={error?'alert':'status'}>{children}</p>}
export function Check({children,checked,onChange,required=false}){return <label className="school-check"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} required={required}/>{children}</label>}
