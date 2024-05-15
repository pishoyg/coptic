#include "mhebrdict.h"
#include "ui_mhebrdict.h"

unsigned int MHebrDict::count=0;
QString  MHebrDict::_template("<a name=\"(*number*)\"></a><table width=\"100%\"><body><tr><td> ((*number*)) </td><td align=\"left\"> <big>(*word*)</big> </td><td><a href=\"(*number*)c\">concordance</a></td></tr><tr><td colspan=\"3\">(*definition*)</td></tr></body></table>");

QStringList MHebrDict::bnames = QStringList()   <<QString("Genesis")
                                                <<QString("Exodus")
                                                <<QString("Leviticus")
                                                <<QString("Numbers")
                                                <<QString("Deuteronomy")
                                                <<QString("Joshua")
                                                <<QString("Judges")
                                                <<QString("1 Samuel")
                                                <<QString("2 Samuel")
                                                <<QString("1 Kings")
                                                <<QString("2 Kings")
                                                <<QString("Isaiah")
                                                <<QString("Jeremiah")
                                                <<QString("Ezekiel")
                                                <<QString("Hosea")
                                                <<QString("Joel")
                                                <<QString("Amos")
                                                <<QString("Obadiah")
                                                <<QString("Jonah")
                                                <<QString("Micah")
                                                <<QString("Nahum")
                                                <<QString("Habakkuk")
                                                <<QString("Zephaniah")
                                                <<QString("Haggai")
                                                <<QString("Zechariah")
                                                <<QString("Malachi")
                                                <<QString("Psalms")
                                                <<QString("Proverbs")
                                                <<QString("Job")
                                                <<QString("Song of songs")
                                                <<QString("Ruth")
                                                <<QString("Lamentations")
                                                <<QString("Ecclesiastes")
                                                <<QString("Esther")
                                                <<QString("Daniel")
                                                <<QString("Ezra")
                                                <<QString("Nehemiah")
                                                <<QString("1 Chronicles")
                                                <<QString("2 Chronicles");


MHebrDict::MHebrDict(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MHebrDict),
    _content(),_content_title(),
    _inpText(),
    _book(-1),_chapter(-1),_verse(-1),
    popup()
{
    ui->setupUi(this);

    setWindowTitle(tr("Hebrew dictionary (")+QString::number(++count)+")");

    ui->wdgOutput->browser()->clear();

    ui->wdgOutput->disableDictionaries(false);
    ui->wdgOutput->allowChangeScript();
    ui->wdgOutput->init(windowTitle(),CBookTextBrowser::Hebrew);
    connect(ui->wdgOutput->browser(),SIGNAL(anchorClicked(QUrl)),this,SLOT(slot_outputAnchorClicked(QUrl)));
    ui->wdgOutput->browser()->setHtml("<b>Strong's Hebrew Dictionary</b><br>8674 entries<br><br><small><i>Leningrad Codex (accents, vowels, consonants, morphology) should be installed for full functionality.</i></small>");
    ui->spnLimit->setValue(m_sett()->queryResultsCount());

    ui->txtInput->setScript(CTranslit::Hebrew,false);

    ui->wdgConc->hide();
    ui->trwConc->header()->setResizeMode(QHeaderView::ResizeToContents);

    QFont hf=m_sett()->hebrewFont();
    hf.setPointSize(m_sett()->hebrewFontSize());
    ui->lblVerse->setFont(hf);
    ui->cmbItems->setFont(hf);

    QFont af=ui->trwConc->font();
    af.setPointSize(af.pointSize()+2);
    ui->trwConc->setFont(af);

    ui->txtInput->activate();
    ui->wdgVerse->hide();

    a_show=popup.addAction(tr("&show verse"));
    a_analyse=popup.addAction(tr("&analyze"));

    IC_SIZES
}

MHebrDict::~MHebrDict()
{
    RM_WND;
    delete ui;
}

bool MHebrDict::isWLC(int bnum)
{
    return bnum>=M_WLC_ACC&&bnum<=M_WLC_MORPH+50;
}

QString MHebrDict::prepareWLC(QString const & text)
{
    return QString(text).remove(QRegExp("\\[.\\]"));
}

void MHebrDict::queryNumber(int num)
{
    USE_CLEAN_WAIT

    QString s=QString::number(num);

    _content.clear();
    _content_title.clear();
    _inpText=" number, "+s;


    QString query("select `number`,`word_acc`,`definition` from `dict_hebr` where `number`="+s);
    query.append(limit());
    MQUERY_GETFIRST(q,query)
    m_msg()->MsgOk();


    int const number=q.value(0).toInt();
    QString const num_t=QString::number(number);
    QString const word=q.value(1);
    QString def=q.value(2);

    QRegExp r("H[0-9]+");
    r.setMinimal(false);
    while(r.indexIn(def)!=-1){
        QString const cap=r.cap();
        QString const cnum=cap.mid(1);
        def.replace(cap,"<a href=\""+cnum+"d\">"+"H-"+cnum+"</a>");
    }

    QString t(_template);
    t.replace("(*number*)",num_t);
    t.replace("(*word*)","<big>"+word+"</big>");
    t.replace("(*definition*)",def);
    _content.append(t);
    _content_title.append("("+num_t+") "+word);


    fillContent(true,true);
    ui->wdgOutput->finalizeContent();
}

void MHebrDict::queryHebWord(QString const & word)
{
    ui->twInput->setCurrentIndex(0);
    ui->rbExact->setChecked(true);
    query(word);
}

void MHebrDict::query(QString const & word)
{
    ui->txtInput->setText(word);
    QString s=ui->txtInput->text_utf8();
    s.remove(" ");
    if(s.isEmpty()){
        m_msg()->MsgErr(tr("input text is empty!"));
        return;
    }

    USE_CLEAN_WAIT

    _content.clear();
    _content_title.clear();
    _inpText=s;

    QString cmp("=");
    if(ui->rbRegexp->isChecked())
        cmp="REGEXP";

    QString query("select distinct `dict_hebr`.`number`,`dict_hebr`.`word_acc`,`dict_hebr`.`definition` from `dict_hebr` join `dict_index_hebr` on `dict_hebr`.`number`=`dict_index_hebr`.`number` where `dict_index_hebr`.`word` "+cmp+" '"+s+"' order by `dict_hebr`.`number`");
    query.append(limit());
    MQUERY(q,query)
    m_msg()->MsgOk();


    while(q.next()){
        int const number=q.value(0).toInt();
        QString const num_t=QString::number(number);
        QString const word=q.value(1);
        QString def=q.value(2);

        QRegExp r("H[0-9]+");
        r.setMinimal(false);
        while(r.indexIn(def)!=-1){
            QString const cap=r.cap();
            QString const cnum=cap.mid(1);
            def.replace(cap,"<a href=\""+cnum+"d\">"+"H-"+cnum+"</a>");
        }

        QString t(_template);
        t.replace("(*number*)",num_t);
        t.replace("(*word*)","<big>"+word+"</big>");
        t.replace("(*definition*)",def);
        _content.append(t);
        _content_title.append("("+num_t+") "+word);
    }

    fillContent(true,true);
    ui->wdgOutput->finalizeContent();
}

void MHebrDict::queryFulltext(QString const & word)
{
    if(word.isEmpty()){
        m_msg()->MsgErr(tr("input text is empty!"));
        return;
    }

    USE_CLEAN_WAIT

    _content.clear();
    _content_title.clear();
    _inpText=word+" (fulltext)";

    QString cmp("=");
    if(ui->rbRegexp->isChecked())
        cmp="REGEXP";

    QString query("select `number`,`word_acc`,`definition` from `dict_hebr` where `definition` regexp '"+word+"' order by `number`");
    query.append(limit());
    MQUERY(q,query)
    m_msg()->MsgOk();

    while(q.next()){
        int const number=q.value(0).toInt();
        QString const num_t=QString::number(number);
        QString const word=q.value(1);
        QString def=q.value(2);

        QRegExp r("H[0-9]+");
        r.setMinimal(false);
        while(r.indexIn(def)!=-1){
            QString const cap=r.cap();
            QString const cnum=cap.mid(1);
            def.replace(cap,"<a href=\""+cnum+"d\">"+"H-"+cnum+"</a>");
        }

        QString t(_template);
        t.replace("(*number*)",num_t);
        t.replace("(*word*)","<big>"+word+"</big>");
        t.replace("(*definition*)",def);
        _content.append(t);
        _content_title.append("("+num_t+") "+word);
    }

    fillContent(true,true);
    ui->wdgOutput->finalizeContent();

    ui->wdgOutput->inputBox().setSwitchState(false);
    ui->wdgOutput->inputBox().setText(word);
    ui->wdgOutput->setPanelVisibility(true);
    ui->wdgOutput->highlightText(true);
}

void MHebrDict::on_btStart_clicked()
{
    switch (ui->twInput->currentIndex()) {
    case 0:
        query(ui->txtInput->text_utf8());
        ui->txtInput->updateHistory();
        break;
    case 1:
        queryFulltext(ui->txtFulltext->text_utf8());
        ui->txtFulltext->updateHistory();
        break;
    case 2:
        queryNumber(ui->spnByNumber->value());
        break;
    default:
        break;
    }
}

void MHebrDict::analyseVerse(int book, int chapter, int verse, int verse_max)
{
    ui->trwConc->clear();
    ui->wdgConc->show();
    ui->lblConcTitle->setText(bnames.at(book)+" "+QString::number(chapter)+":"+QString::number(verse));

    QTreeWidgetItem * i=new QTreeWidgetItem(0);
    MConcItem * vi=0;
    i->setText(0,bnames.at(book));
    for(int x=1;x<=verse_max;x++){
        MConcItem * ci=new MConcItem();
        ci->_book=book;
        ci->_chapter=chapter;
        ci->_verse=x;
        ci->setText(0,QString::number(ci->_chapter)+":"+QString::number(ci->_verse));
        if(x==verse){
            vi=ci;
            QFont f=ci->font(0);
            f.setBold(true);
            ci->setFont(0,f);
        }
        i->addChild(ci);
    }

    ui->trwConc->addTopLevelItem(i);
    ui->trwConc->expandItem(i);

    showVerse(book,chapter,verse);

    if(vi)
        ui->trwConc->scrollToItem(vi);

    queryConcordance(book,chapter,verse);
}

void MHebrDict::queryConcordance(int book, int chapter, int verse)
{
    USE_CLEAN_WAIT

    _content.clear();
    _content_title.clear();


    QString const t_book=QString::number(book);
    QString const t_chapter=QString::number(chapter);
    QString const t_verse=QString::number(verse);

    _inpText="concordance, "+bnames.at(book)+" "+t_chapter+":"+t_verse;

    QString query("select distinct `number`,`word_acc`,`definition` from `dict_hebr` inner join `conc_hebr` on `dict_hebr`.`number`=`conc_hebr`.`num` where `conc_hebr`.`book`=<book> and `conc_hebr`.`chapter`=<chapter> and `conc_hebr`.`verse`=<verse> order by `dict_hebr`.`number`");
    query.replace("<book>",t_book);
    query.replace("<chapter>",t_chapter);
    query.replace("<verse>",t_verse);

    MQUERY(q,query)

    while(q.next()){
        int const number=q.value(0).toInt();
        QString const num_t=QString::number(number);
        QString const word=q.value(1);
        QString def=q.value(2);

        QRegExp r("H[0-9]+");
        r.setMinimal(false);
        while(r.indexIn(def)!=-1){
            QString const cap=r.cap();
            QString const cnum=cap.mid(1);
            def.replace(cap,"<a href=\""+cnum+"d\">"+"H-"+cnum+"</a>");
        }

        QString t(_template);
        t.replace("(*number*)",num_t);
        t.replace("(*word*)","<big>"+word+"</big>");
        t.replace("(*definition*)",def);
        _content.append(t);
        _content_title.append("("+num_t+") "+word);
    }
    fillContent(true,true);
    ui->wdgOutput->finalizeContent();
}

void MHebrDict::fillContent(bool show_first, bool header)
{

    ui->cmbItems->clear();

    QString s;
    QRegExp r("[0-9]+"),r2("<.*>");
    r.setMinimal(false);
    r2.setMinimal(true);
    foreach (s, _content_title) {
        r.indexIn(s);
        s.remove(r2);
        ui->cmbItems->addItem(s,r.cap());
    }

    QString content=_content.join("<br>");
    if(header)
        content.prepend(tr("input: ")+_inpText+tr(" / matches: ")+QString::number(_content.count())+"<br>");
    ui->wdgOutput->browser()->setHtml(content);
    if(show_first)
        ui->wdgOutput->browser()->moveCursor(QTextCursor::Start);
    else
        ui->wdgOutput->browser()->moveCursor(QTextCursor::End);
}

void MHebrDict::slot_outputAnchorClicked ( const QUrl & link )
{
    QString number=link.path();
    bool const dict=number.right(1)=="d";
    number.chop(1);

    USE_CLEAN_WAIT

    if(!dict){
        ui->trwConc->clear();
        ui->lblVerse->clear();
        ui->wdgVerse->hide();
        ui->lblConcTitle->setText("("+number+")");

        QList<QTreeWidgetItem*> _items;

        QString query("select `book`,`chapter`,`verse` from `conc_hebr` where `num`="+number+" order by `book`,`chapter`,`verse`");
        MQUERY(q,query)
        m_msg()->MsgOk();
        int lastbook=-1;
        QTreeWidgetItem * last_i=0;
        MConcItem * last_child=0;
        while(q.next()){
            int const book=q.value(0).toInt();
            QString const chapter=q.value(1);
            QString const verse=q.value(2);

            MConcItem * i=new MConcItem();
            if(book!=lastbook){
                last_child=0;
                i->setText(0,bnames.at(book));
                _items.append(last_i=i);

                MConcItem * ifirst=new MConcItem();
                ifirst->setText(0,chapter+":"+verse);
                ifirst->_book=book;
                ifirst->_chapter=chapter.toInt();
                ifirst->_verse=verse.toInt();
                last_i->addChild(last_child=ifirst);
            }else{
                i->setText(0,chapter+":"+verse);
                i->_book=book;
                i->_chapter=chapter.toInt();
                i->_verse=verse.toInt();
                if(last_child){
                    if(i->_chapter==last_child->_chapter&&i->_verse==last_child->_verse){
                        last_child->_count++;
                        delete i;
                    }else
                        last_i->addChild(last_child=i);
                }else
                    last_i->addChild(last_child=i);
            }
            lastbook=book;
        }

        for(int x=0;x<_items.count();x++){
            QTreeWidgetItem * ti=_items.at(x);
            int c=0;
            for(int y=0;y<ti->childCount();y++){
                MConcItem * ci=(MConcItem*)ti->child(y);
                c+=ci->_count;
                if(ci->_count>1)
                    ci->setText(1,QString::number(ci->_count)+"x");
            }
            ti->setText(1,QString::number(ti->childCount())+"/"+QString::number(c));
        }


        ui->trwConc->addTopLevelItems(_items);

        ui->wdgConc->show();
    }else{
        QString query("select `word_acc`,`definition` from `dict_hebr` where `number`="+number);
        MQUERY_GETFIRST(q,query)

        QString const word=q.value(0);
        QString def=q.value(1);

        QRegExp r("H[0-9]+");
        r.setMinimal(false);
        while(r.indexIn(def)!=-1){
            QString const cap=r.cap();
            QString const cnum=cap.mid(1);
            def.replace(cap,"<a href=\""+cnum+"d\">"+"H-"+cnum+"</a>");
        }

        QString t(_template);
        t.replace("(*number*)",number);
        t.replace("(*word*)","<big>"+word+"</big>");
        t.replace("(*definition*)",def);
        _content.append(t);
        _content_title.append("("+number+") "+word);
        fillContent(false,false);
    }
}

void MHebrDict::on_trwConc_itemActivated(QTreeWidgetItem *item, int )
{
    //ui->wdgVerse->hide();
    if(item){
        if(item->parent()!=0){
            MConcItem * i=(MConcItem*)item;
            showVerse(i->_book,i->_chapter,i->_verse);
        }
    }
}

void MHebrDict::on_cmbAcc_currentIndexChanged(int index)
{
    if(index!=-1&&_book>=0&&_chapter>0&&_verse>0)
        showVerse(_book,_chapter,_verse);
}

void MHebrDict::showVerse(int book, int chapter, int verse)
{
    int ht=ui->cmbAcc->currentIndex();
    if(ht==-1)
        ht=0;
    int htbi=M_WLC_VOW;
    switch(ht){
    case 0:
        htbi=M_WLC_VOW;
        break;
    case 1:
        htbi=M_WLC_CONS;
        break;
    case 2:
        htbi=M_WLC_ACC;
        break;
    case 3:
        htbi=M_WLC_MORPH;
        break;
    }

    QString query("select `text` from `library` where `book`=<book> and `chapter`=<chapter> and `verse`=<verse>");
    query.replace("<book>",QString::number(htbi+book+1));
    query.replace("<chapter>",QString::number(chapter));
    query.replace("<verse>",QString::number(verse));
    MQUERY_GETFIRST(q,query)

    ui->lblVerse->setText(bnames.at(book)+" "+QString::number(chapter)+":"+QString::number(verse)+"\n"+prepareWLC(q.value(0)));
    ui->wdgVerse->show();
    _book=book; _chapter=chapter; _verse=verse;
}

void MHebrDict::on_cmbItems_activated(int index)
{
    if(index!=-1){
        QString const num=ui->cmbItems->itemData(index).toString();
        ui->wdgOutput->browser()->scrollToAnchor(num);
    }
}

void MHebrDict::on_tbPrevVerse_clicked()
{
    if(--_verse<1)
        _verse=1;
    if(_book>=0&&_chapter>0)
        showVerse(_book,_chapter,_verse);
}

void MHebrDict::on_tbNextVerse_clicked()
{
    if(_book>=0&&_chapter>0&&_verse>0)
        showVerse(_book,_chapter,++_verse);
}

void MHebrDict::on_tbFontPlus_clicked()
{
    QFont f=ui->lblVerse->font();
    f.setPointSize(f.pointSize()+1);
    ui->lblVerse->setFont(f);
}

void MHebrDict::on_tbFontMinus_clicked()
{
    QFont f=ui->lblVerse->font();
    f.setPointSize(f.pointSize()-1);
    ui->lblVerse->setFont(f);
}

void MHebrDict::on_tbFontConcPlus_clicked()
{
    QFont f=ui->trwConc->font();
    f.setPointSize(f.pointSize()+1);
    ui->trwConc->setFont(f);
}

void MHebrDict::on_tbFontConcMinus_clicked()
{
    QFont f=ui->trwConc->font();
    f.setPointSize(f.pointSize()-1);
    ui->trwConc->setFont(f);
}

void MHebrDict::on_trwConc_customContextMenuRequested(const QPoint &)
{
    QTreeWidgetItem * wi=ui->trwConc->currentItem();
    bool p(false);
    if(wi)
        p=wi->parent();
    a_show->setEnabled(p);
    a_analyse->setEnabled(p);

    QAction * a=popup.exec();
    if(a){
        if(a==a_show){
            on_trwConc_itemActivated(ui->trwConc->currentItem(),0);
        }else if(a==a_analyse){
            if(wi&&p){
                MConcItem *ci((MConcItem *)wi);
                queryConcordance(ci->_book,ci->_chapter,ci->_verse);
            }
        }
    }
}

void MHebrDict::on_tbActionConc_clicked(bool checked)
{
    if(checked)
    {
        popup.setButton(ui->tbActionConc);
        on_trwConc_customContextMenuRequested(QPoint());
    }
}

QString MHebrDict::limit() const
{
    return QString(" limit ")+QString::number(
            (ui->spnPage->value()-1)*ui->spnLimit->value())+","+
            QString::number(ui->spnLimit->value());
}

void MHebrDict::on_tbConcHide_clicked()
{
    ui->wdgConc->hide();
}

void MHebrDict::on_tbVerseClose_clicked()
{
    ui->wdgVerse->hide();
}
