#include "mtipofthewiseman.h"
#include "ui_mtipofthewiseman.h"

MTipOfTheWiseMan::MTipOfTheWiseMan(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MTipOfTheWiseMan),
    _last_tip(-1),
    _max_tip(1)
{
    ui->setupUi(this);

    setWindowFlags(windowFlags()|Qt::WindowStaysOnTopHint);

    QString const query("select count(*) from `tipoftheday`");
    MQUERY_GETFIRST(q,query);
    _max_tip=q.value(0).toInt();

    QRect const r=QApplication::desktop()->screenGeometry();
    int const w=r.width()/3,h=r.height()/3;
    if(w<100||h<100)
    {
        resize(QSize(300,200));
        move(QPoint(10,10));
    }
    else
    {
        resize(QSize(w,h));
        move(QPoint(w,h));
    }

    if(m_sett()){m_sett()->setIcSizes(*this); m_sett()->updButtonToolTips(*this);}

    if(_max_tip>0)
    {
        qsrand(QTime::currentTime().msec());
        on_btNextTip_clicked();
    }
    else
        ui->btNextTip->setEnabled(false);
}

MTipOfTheWiseMan::~MTipOfTheWiseMan()
{
    delete ui;
}

void MTipOfTheWiseMan::on_btClose_clicked()
{
    close();
}

void MTipOfTheWiseMan::on_btNextTip_clicked()
{

    int curtip=qrand()%_max_tip;
    if(curtip==_last_tip)
        curtip++;
    if(curtip>=_max_tip)
        curtip=0;
    _last_tip=curtip;
    QString query("select ");
    if(m_sett()->isLangEnglish())
        query.append("`en_text`");
    else
        query.append("`cz_text`");
    query.append(" from `tipoftheday` order by `id` limit ");
    query.append(QString::number(_last_tip));
    query.append(",1");

    MQUERY_GETFIRST(q,query);

    QString tip(q.value(0));
    tip.prepend("<p style=\"text-indent: 40px; margin: 10px;\"><big>");
    tip.append("</big></p>");
    ui->txtTip->setHtml(tip);

}

void MTipOfTheWiseMan::on_txtTip_anchorClicked(const QUrl &arg1)
{
    if(arg1.isValid()&&!arg1.isEmpty())
        if(m_sett())
            m_sett()->execBrowser(arg1);
}
